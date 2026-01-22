import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import fs from 'fs';

const geminiService = new GeminiService();

export const indexDocument = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        console.log(`Processing file: ${filePath}, MIME type: ${mimeType}`);

        // Parse metadata if provided (as a JSON string in multipart form)
        let metadata = {};
        if (req.body.metadata) {
            try {
                metadata = JSON.parse(req.body.metadata);
            } catch (e) {
                console.warn('Failed to parse metadata:', req.body.metadata);
            }
        }

        // Check if file exists and is readable
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'Uploaded file not found' });
        }

        const result = await geminiService.uploadDocument(filePath, mimeType, metadata);

        // Clean up the uploaded file from local storage after indexing
        try {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up temporary file: ${filePath}`);
        } catch (cleanupError) {
            console.warn('Failed to cleanup temporary file:', cleanupError);
            // Don't fail the request if cleanup fails
        }

        res.json({ message: 'Document indexed successfully', result });
    } catch (error: any) {
        console.error('Error indexing document:', error);
        
        // Clean up file if it exists and there was an error
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.warn('Failed to cleanup file after error:', cleanupError);
            }
        }
        
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const search = async (req: Request, res: Response) => {
    try {
        const { query, filter } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const result = await geminiService.query(query, filter);
        res.json(result);
    } catch (error: any) {
        console.error('Error searching:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const listDocuments = async (req: Request, res: Response) => {
    try {
        const documents = await geminiService.listDocuments();
        res.json({ documents, total: documents.length });
    } catch (error: any) {
        console.error('Error listing documents:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const documentId = req.params.documentId as string;
        
        if (!documentId) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        
        const result = await geminiService.deleteDocument(documentId);
        res.json(result);
    } catch (error: any) {
        console.error('Error deleting document:', error);
        if (error.message === 'Document not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
};

export const getStoreInfo = async (req: Request, res: Response) => {
    try {
        const storeInfo = await geminiService.getStoreInfo();
        res.json(storeInfo);
    } catch (error: any) {
        console.error('Error getting store info:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
