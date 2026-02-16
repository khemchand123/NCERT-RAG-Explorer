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

            // The entire file IS the system prompt — use it directly
            // Strip the markdown code block fences (```json ... ```) but keep the XML-style tags
            // Remove only the JSON output format code block markers, keep the content
            const cleanedContent = promptsContent
                .replace(/^```json\s*$/gm, '')  // Remove ```json markers
                .replace(/^```\s*$/gm, '')       // Remove ``` markers
                .trim();

            if (cleanedContent.length > 100) {
                console.log(`Loaded system instruction from COPY_PASTE_PROMPTS.md (${cleanedContent.length} chars)`);
                return cleanedContent;
            } else {
                console.warn('COPY_PASTE_PROMPTS.md content too short, using fallback');
            }
        } else {
            console.warn('COPY_PASTE_PROMPTS.md file not found');
        }
    } catch (error) {
        console.error('Error loading system instruction:', error);
    }

    // Fallback to default instruction
    return "You are the Government of India Pharmaceutical Regulatory Compliance Assistant. Analyze pharmaceutical regulatory documents and provide accurate, structured information about the regulatory status of medicines in India. Only answer questions using the provided documents.";
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

            let documentList: any[] = [];

            try {
                // Use the official documents.list API
                const documents = await this.client.fileSearchStores.documents.list({
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
            } catch (apiError: any) {
                console.error('documents.list API failed:', apiError?.message || apiError);
                throw new Error('Unable to access Gemini document list API');
            }

            // Sync local store with Gemini store
            if (documentList.length > 0) {
                // Update local store with Gemini document names for deletion support
                for (const geminiDoc of documentList) {
                    const localDoc = documentsStore.find(d =>
                        d.displayName === geminiDoc.displayName ||
                        d.geminiDocumentName === geminiDoc.name
                    );
                    if (localDoc && !localDoc.geminiDocumentName) {
                        localDoc.geminiDocumentName = geminiDoc.name;
                        saveDocuments(documentsStore);
                    }
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

            console.log(`Attempting to delete document: ${documentId}`);

            // Resolve the full Gemini document name
            let geminiDocumentName = '';
            let localDoc: any = null;

            if (documentId.includes('fileSearchStores/') && documentId.includes('/documents/')) {
                // Already a full Gemini document name
                geminiDocumentName = documentId;
            } else if (documentId.startsWith('files/')) {
                // Our local naming convention — find the actual Gemini document name
                localDoc = documentsStore.find(doc => doc.name === documentId);
                if (localDoc && localDoc.geminiDocumentName) {
                    geminiDocumentName = localDoc.geminiDocumentName;
                } else {
                    // Try to find by listing documents from Gemini
                    console.log('Document not in local store with Gemini name, searching Gemini store...');
                    const geminiDocs = await this.listDocumentsFromGemini(store.name);
                    const matchingDoc = geminiDocs.find(d =>
                        d.displayName === localDoc?.displayName ||
                        d.name?.includes(documentId)
                    );
                    if (matchingDoc) {
                        geminiDocumentName = matchingDoc.name;
                    }
                }
            } else {
                // Assume it's a document ID, construct full path
                geminiDocumentName = `${store.name}/documents/${documentId}`;
            }

            // Delete from Gemini store
            let geminiDeleted = false;
            if (geminiDocumentName) {
                try {
                    console.log(`Deleting from Gemini: ${geminiDocumentName}`);
                    await this.client.fileSearchStores.documents.delete({
                        name: geminiDocumentName,
                        config: { force: true }
                    });
                    console.log(`Successfully deleted from Gemini store: ${geminiDocumentName}`);
                    geminiDeleted = true;
                } catch (apiError: any) {
                    console.error('Gemini delete failed:', apiError?.message || apiError);
                    // Don't throw — still remove from local store
                }
            } else {
                console.warn('Could not resolve Gemini document name, performing local deletion only');
            }

            // Remove from local storage
            const localIndex = documentsStore.findIndex(doc =>
                doc.name === documentId ||
                doc.geminiDocumentName === geminiDocumentName ||
                doc.geminiDocumentName === documentId
            );

            let deletedDoc = null;
            if (localIndex !== -1) {
                deletedDoc = documentsStore.splice(localIndex, 1)[0];
                saveDocuments(documentsStore);
                console.log(`Removed from local storage. Remaining documents: ${documentsStore.length}`);
            }

            return {
                message: geminiDeleted
                    ? 'Document deleted successfully'
                    : 'Document removed from local storage (Gemini deletion may have failed)',
                document: deletedDoc || { name: documentId, displayName: documentId }
            };

        } catch (error: any) {
            console.error('Error in delete operation:', error);

            // Fallback to local deletion only
            const index = documentsStore.findIndex(doc => doc.name === documentId);

            if (index === -1) {
                throw new Error('Document not found');
            }

            const deletedDoc = documentsStore.splice(index, 1)[0];
            saveDocuments(documentsStore);
            console.log(`Deleted from local storage only: ${deletedDoc.displayName}`);

            return {
                message: 'Document deleted from local storage (Gemini API error)',
                document: deletedDoc
            };
        }
    }

    // Helper to list documents directly from Gemini (for internal use)
    private async listDocumentsFromGemini(storeName: string): Promise<any[]> {
        const documentList: any[] = [];
        try {
            const documents = await this.client.fileSearchStores.documents.list({
                parent: storeName,
            });
            for await (const doc of documents) {
                documentList.push(doc);
            }
        } catch (error: any) {
            console.error('Failed to list documents from Gemini:', error?.message);
        }
        return documentList;
    }

    async deleteAllDocuments() {
        try {
            const store = await this.getOrCreateStore(config.storeName);

            if (!store.name) {
                throw new Error('Store name is undefined');
            }

            console.log('Deleting all documents...');

            // Get all documents from Gemini store
            const geminiDocs = await this.listDocumentsFromGemini(store.name);
            const deleteResults: { name: string; success: boolean; error?: string }[] = [];

            // Delete each document from Gemini
            for (const doc of geminiDocs) {
                try {
                    await this.client.fileSearchStores.documents.delete({
                        name: doc.name,
                        config: { force: true }
                    });
                    deleteResults.push({ name: doc.name, success: true });
                    console.log(`Deleted from Gemini: ${doc.name}`);
                } catch (error: any) {
                    deleteResults.push({ name: doc.name, success: false, error: error?.message });
                    console.error(`Failed to delete ${doc.name}:`, error?.message);
                }
            }

            // Clear local storage
            const localCount = documentsStore.length;
            documentsStore = [];
            saveDocuments(documentsStore);

            return {
                message: 'All documents deleted',
                geminiDeleted: deleteResults.filter(r => r.success).length,
                geminiFailed: deleteResults.filter(r => !r.success).length,
                localDeleted: localCount,
                details: deleteResults
            };

        } catch (error: any) {
            console.error('Error deleting all documents:', error);

            // Fallback: at least clear local storage
            const localCount = documentsStore.length;
            documentsStore = [];
            saveDocuments(documentsStore);

            return {
                message: 'Local storage cleared (Gemini deletion may have failed)',
                geminiDeleted: 0,
                geminiFailed: 0,
                localDeleted: localCount,
                details: []
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