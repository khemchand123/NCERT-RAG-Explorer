import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

// File-based storage for persistence (in production, use a database)
const DOCUMENTS_FILE = path.join(__dirname, '../data/documents.json');

// Ensure data directory exists
const dataDir = path.dirname(DOCUMENTS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load documents from file
function loadDocuments(): any[] {
    try {
        if (fs.existsSync(DOCUMENTS_FILE)) {
            const data = fs.readFileSync(DOCUMENTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
    return [];
}

// Save documents to file
function saveDocuments(documents: any[]): void {
    try {
        fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(documents, null, 2));
    } catch (error) {
        console.error('Error saving documents:', error);
    }
}

// Initialize documents from file
let documentsStore: any[] = loadDocuments();
console.log(`Loaded ${documentsStore.length} documents from persistent storage`);

export class GeminiService {
    private client: GoogleGenAI;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }

    async getOrCreateStore(displayName: string) {
        let fileStore = null;
        const pager = await this.client.fileSearchStores.list({
            config: { pageSize: 20 } // Gemini API limit is 20
        });

        // Iterate through pages to find the store
        let page = pager.page;
        let hasNextPage = true;

        while (hasNextPage) {
            if (page) {
                for (const store of page) {
                    if (store.displayName === displayName) {
                        fileStore = store;
                        break;
                    }
                }
            }
            if (fileStore) break;

            if (pager.hasNextPage()) {
                page = await pager.nextPage();
            } else {
                hasNextPage = false;
            }
        }

        if (fileStore) {
            console.log(`Found existing store: ${fileStore.name}`);
            return fileStore;
        }

        console.log(`Creating new store: ${displayName}`);
        const createStoreOp = await this.client.fileSearchStores.create({
            config: { displayName: displayName }
        });

        return createStoreOp;
    }

    async uploadDocument(filePath: string, mimeType: string, metadata?: Record<string, string>) {
        const store = await this.getOrCreateStore(config.storeName);
        const fileName = path.basename(filePath);

        if (!store.name) {
            throw new Error('Store name is undefined');
        }

        console.log(`Uploading ${fileName} to store ${store.name} with metadata:`, metadata);

        const customMetadata = metadata ? Object.entries(metadata).map(([key, value]) => ({
            key,
            stringValue: value
        })) : [];

        // Upload and start indexing
        let operation = await this.client.fileSearchStores.uploadToFileSearchStore({
            file: filePath,
            fileSearchStoreName: store.name,
            config: {
                displayName: fileName,
                customMetadata
            }
        });

        console.log(`Upload started for ${fileName}, waiting for processing...`);

        // Wait for processing to complete
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            operation = await this.client.operations.get({ operation });
        }

        console.log(`Processed: ${fileName}`);

        // Store document info for listing (persistent storage)
        const documentInfo = {
            name: `files/${Date.now()}-${fileName}`,
            displayName: fileName,
            mimeType: mimeType,
            sizeBytes: fs.statSync(filePath).size,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            metadata: customMetadata,
            state: 'ACTIVE',
            geminiDocumentName: operation.response?.documentName || '',
            geminiStoreName: store.name
        };

        documentsStore.push(documentInfo);
        saveDocuments(documentsStore);
        console.log(`Saved document to persistent storage. Total documents: ${documentsStore.length}`);

        return operation;
    }

    async query(prompt: string, metadataFilter?: string) {
        const store = await this.getOrCreateStore(config.storeName);

        if (!store.name) {
            throw new Error('Store name is undefined');
        }

        console.log(`Querying store ${store.name} with prompt: "${prompt}" and filter: "${metadataFilter}"`);

        const response = await this.client.models.generateContent({
            model: config.geminiModel,
            contents: prompt,
            config: {
                tools: [{
                    fileSearch: {
                        fileSearchStoreNames: [store.name],
                        metadataFilter: metadataFilter
                    }
                }]
            }
        });

        return {
            text: response.text,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata
        };
    }

    async listDocuments() {
        console.log(`Listing ${documentsStore.length} documents from persistent store`);

        // Return documents from our persistent store
        return [...documentsStore].reverse(); // Most recent first
    }

    async deleteDocument(documentId: string) {
        console.log(`Deleting document with ID: ${documentId}`);

        // Find document in store
        const index = documentsStore.findIndex(doc => doc.name === documentId);

        if (index === -1) {
            throw new Error('Document not found');
        }

        // Remove from store
        const deletedDoc = documentsStore.splice(index, 1)[0];
        saveDocuments(documentsStore);
        console.log(`Saved updated documents to persistent storage. Total documents: ${documentsStore.length}`);

        // In production, you would also delete from Gemini File Search Store
        // For now, we just remove from our local tracking

        console.log(`Deleted document: ${deletedDoc.displayName}`);
        return { message: 'Document deleted successfully', document: deletedDoc };
    }

    // Method to get store info
    async getStoreInfo() {
        try {
            const store = await this.getOrCreateStore(config.storeName);
            return {
                storeName: store.name,
                displayName: store.displayName,
                documentsCount: documentsStore.length
            };
        } catch (error) {
            console.error('Error getting store info:', error);
            return null;
        }
    }
}