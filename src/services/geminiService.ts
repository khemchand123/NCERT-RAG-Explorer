import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

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

        // The create operation returns the store directly or an operation? 
        // Based on the article: "const createStoreOp = await ai.fileSearchStores.create(...) -> console.log(createStoreOp.name)"
        // It seems it returns the store object directly or a long running op that resolves to it.
        // Let's assume it returns the store object as per the article snippet.
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
}
