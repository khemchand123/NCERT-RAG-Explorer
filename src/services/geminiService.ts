import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import { SessionManager } from './sessionManager';
import fs from 'fs';
import path from 'path';

// File-based storage for persistence (in production, use a database)
const DOCUMENTS_FILE = path.join(__dirname, '../data/documents.json');

// Read system instruction from COPY_PASTE_PROMPTS.md
const PROMPTS_FILE = path.join(__dirname, '../../COPY_PASTE_PROMPTS.md');
let systemInstruction = "You are a helpful assistant. Only answer questions using the provided documents.";

// Load system instruction from file
function loadSystemInstruction(): string {
    try {
        if (fs.existsSync(PROMPTS_FILE)) {
            const promptsContent = fs.readFileSync(PROMPTS_FILE, 'utf8');

            // Extract the system instruction from the markdown file
            // Look for the content between the first ``` blocks
            const codeBlockRegex = /```\n([\s\S]*?)\n```/;
            const match = promptsContent.match(codeBlockRegex);

            if (match && match[1]) {
                console.log('Loaded system instruction from COPY_PASTE_PROMPTS.md');
                return match[1].trim();
            } else {
                console.warn('Could not extract system instruction from COPY_PASTE_PROMPTS.md');
            }
        } else {
            console.warn('COPY_PASTE_PROMPTS.md file not found');
        }
    } catch (error) {
        console.error('Error loading system instruction:', error);
    }

    // Fallback to default instruction
    return "You are a helpful assistant. Only answer questions using the provided documents.";
}

// Load the system instruction at startup
systemInstruction = loadSystemInstruction();

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
    private sessionManager: SessionManager;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
        this.sessionManager = new SessionManager();
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
        console.log(`Gemini document name: ${operation.response?.documentName}`);

        return operation;
    }

    async query(prompt: string, metadataFilter?: string, sessionId?: string) {
        const store = await this.getOrCreateStore(config.storeName);

        if (!store.name) {
            throw new Error('Store name is undefined');
        }

        console.log(`Querying store ${store.name} with prompt: "${prompt}" and filter: "${metadataFilter}"`);

        // Build conversation contents array
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        // Add conversation history if sessionId is provided
        if (sessionId) {
            const history = this.sessionManager.formatHistoryForGemini(sessionId);
            contents.push(...history);
        }

        // Add current user query
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        const response = await this.client.models.generateContent({
            model: config.geminiModel,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{
                    fileSearch: {
                        fileSearchStoreNames: [store.name],
                        metadataFilter: metadataFilter
                    }
                }]
            }
        });

        const responseText = response.text;

        // Store the conversation in session history if sessionId is provided
        if (sessionId && responseText) {
            this.sessionManager.addToHistory(sessionId, prompt, responseText);
        }

        return {
            text: responseText,
            groundingMetadata: response.candidates?.[0]?.groundingMetadata,
            sessionId: sessionId
        };
    }

    async listDocuments() {
        try {
            const store = await this.getOrCreateStore(config.storeName);

            if (!store.name) {
                throw new Error('Store name is undefined');
            }

            console.log(`Attempting to list documents from Gemini store: ${store.name}`);

            // Try different possible API methods for listing documents
            let documents = null;
            let documentList = [];

            try {
                // Method 1: Try the documents.list approach
                documents = await (this.client as any).fileSearchStores.documents.list({
                    parent: store.name,
                });

                console.log('Using documents.list method');

                for await (const doc of documents) {
                    documentList.push({
                        name: doc.name,
                        displayName: doc.displayName || 'Unknown',
                        mimeType: doc.mimeType || 'application/octet-stream',
                        sizeBytes: doc.sizeBytes || 0,
                        createTime: doc.createTime || new Date().toISOString(),
                        updateTime: doc.updateTime || new Date().toISOString(),
                        metadata: doc.customMetadata || [],
                        state: doc.state || 'ACTIVE'
                    });
                }
            } catch (apiError) {
                console.log('documents.list method not available, trying alternative...');

                // Method 2: Try alternative API structure
                try {
                    const listResponse = await (this.client as any).fileSearchStores.listFiles({
                        fileSearchStoreName: store.name,
                        config: { pageSize: 100 }
                    });

                    console.log('Using listFiles method');

                    if (listResponse.page) {
                        for (const doc of listResponse.page) {
                            documentList.push({
                                name: doc.name,
                                displayName: doc.displayName || 'Unknown',
                                mimeType: doc.mimeType || 'application/octet-stream',
                                sizeBytes: doc.sizeBytes || 0,
                                createTime: doc.createTime || new Date().toISOString(),
                                updateTime: doc.updateTime || new Date().toISOString(),
                                metadata: doc.customMetadata || [],
                                state: doc.state || 'ACTIVE'
                            });
                        }
                    }
                } catch (altApiError: any) {
                    console.log('Alternative API method also failed:', altApiError?.message || altApiError);
                    throw new Error('Unable to access Gemini document list API');
                }
            }

            console.log(`Found ${documentList.length} documents in Gemini store`);
            return documentList.reverse(); // Most recent first

        } catch (error) {
            console.error('Error listing documents from Gemini store:', error);

            // Fallback to local storage if Gemini API fails
            console.log('Falling back to local storage...');
            console.log(`Returning ${documentsStore.length} documents from local storage`);
            return [...documentsStore].reverse();
        }
    }

    async deleteDocument(documentId: string) {
        try {
            const store = await this.getOrCreateStore(config.storeName);

            if (!store.name) {
                throw new Error('Store name is undefined');
            }

            console.log(`Attempting to delete document from Gemini store: ${documentId}`);

            // Extract document name from the full path if needed
            let documentName = documentId;
            let geminiDocumentName = '';

            if (documentId.includes('/documents/')) {
                documentName = documentId.split('/documents/')[1];
                geminiDocumentName = documentId;
            } else if (documentId.startsWith('files/')) {
                // Handle our local naming convention - need to find the actual Gemini document name
                const localDoc = documentsStore.find(doc => doc.name === documentId);
                if (localDoc && localDoc.geminiDocumentName) {
                    geminiDocumentName = localDoc.geminiDocumentName;
                    documentName = localDoc.geminiDocumentName.split('/documents/')[1];
                } else {
                    console.log('Document not found in local store, attempting direct deletion...');
                    geminiDocumentName = `${store.name}/documents/${documentId}`;
                }
            } else {
                geminiDocumentName = `${store.name}/documents/${documentId}`;
            }

            console.log(`Attempting to delete Gemini document: ${geminiDocumentName}`);

            // Try different possible API methods for deleting documents
            try {
                // Method 1: Try the documents.delete approach
                await (this.client as any).fileSearchStores.documents.delete({
                    name: geminiDocumentName
                });
                console.log(`Document deleted using documents.delete method: ${documentName}`);
            } catch (apiError: any) {
                console.log('documents.delete method failed:', apiError?.message || apiError);

                // Method 2: Try alternative deletion method if available
                try {
                    await (this.client as any).fileSearchStores.deleteFile({
                        name: geminiDocumentName
                    });
                    console.log(`Document deleted using deleteFile method: ${documentName}`);
                } catch (altApiError: any) {
                    console.log('Alternative deletion method also failed:', altApiError?.message || altApiError);
                    console.log('Document may not exist in Gemini store or API method unavailable');
                }
            }

            // Remove from local storage for consistency
            const localIndex = documentsStore.findIndex(doc =>
                doc.name === documentId ||
                doc.geminiDocumentName?.includes(documentName)
            );

            let deletedDoc = null;
            if (localIndex !== -1) {
                deletedDoc = documentsStore.splice(localIndex, 1)[0];
                saveDocuments(documentsStore);
                console.log(`Removed document from local storage. Total documents: ${documentsStore.length}`);
            }

            return {
                message: 'Document deletion attempted (check logs for Gemini API status)',
                document: deletedDoc || { name: documentId, displayName: documentName }
            };

        } catch (error) {
            console.error('Error in delete operation:', error);

            // Fallback to local deletion
            console.log('Performing local deletion only...');

            const index = documentsStore.findIndex(doc => doc.name === documentId);

            if (index === -1) {
                throw new Error('Document not found in local storage');
            }

            const deletedDoc = documentsStore.splice(index, 1)[0];
            saveDocuments(documentsStore);
            console.log(`Deleted document from local storage: ${deletedDoc.displayName}`);

            return {
                message: 'Document deleted from local storage (Gemini API unavailable)',
                document: deletedDoc
            };
        }
    }

    // Method to get store info
    async getStoreInfo() {
        try {
            const store = await this.getOrCreateStore(config.storeName);

            // Get actual document count from Gemini store
            const documents = await this.listDocuments();

            return {
                storeName: store.name,
                displayName: store.displayName,
                documentsCount: documents.length
            };
        } catch (error) {
            console.error('Error getting store info:', error);
            return {
                storeName: 'unknown',
                displayName: config.storeName,
                documentsCount: documentsStore.length
            };
        }
    }

    // Session management methods
    getConversationHistory(sessionId: string) {
        return this.sessionManager.getConversationHistory(sessionId);
    }

    clearSession(sessionId: string) {
        this.sessionManager.clearSession(sessionId);
    }

    getSessionStats() {
        return this.sessionManager.getSessionStats();
    }
}