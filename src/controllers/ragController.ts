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

        // Parse metadata if provided (as a JSON string in multipart form)
        let metadata = {};
        if (req.body.metadata) {
            try {
                metadata = JSON.parse(req.body.metadata);
            } catch (e) {
                console.warn('Failed to parse metadata:', req.body.metadata);
            }
        }

        const result = await geminiService.uploadDocument(filePath, mimeType, metadata);

        // Clean up the uploaded file from local storage after indexing
        fs.unlinkSync(filePath);

        res.json({ message: 'Document indexed successfully', result });
    } catch (error: any) {
        console.error('Error indexing document:', error);
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
