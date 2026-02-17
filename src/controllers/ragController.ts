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
        const { query, filter, sessionId } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Generate sessionId if not provided
        const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const result = await geminiService.query(query, filter, finalSessionId);

        // Try to parse the model's text response as JSON (our prompt asks for JSON output)
        let parsedResponse: any = null;
        if (result.text) {
            try {
                // Strip markdown code fences if present (```json ... ```)
                let cleanText = result.text.trim();
                cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

                parsedResponse = JSON.parse(cleanText);
            } catch (parseError) {
                // Model didn't return valid JSON — fall back to raw text
                console.warn('Could not parse model response as JSON, returning raw text');
            }
        }

        if (parsedResponse) {
            // Return the structured JSON response from the model
            // Also ensure 'text' property exists for backward compatibility with frontend
            res.json({
                ...parsedResponse,
                text: parsedResponse.summary || JSON.stringify(parsedResponse, null, 2), // Fallback if summary missing
                groundingMetadata: result.groundingMetadata,
                sessionId: result.sessionId
            });
        } else {
            // Fallback: return raw text response (backward compatibility)
            res.json(result);
        }
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
        // Support multiple ways to pass documentId:
        // 1. Request body (POST /api/documents/delete): { "documentId": "..." }
        // 2. Route param (DELETE /api/documents/:documentId)
        // 3. Query param (?id=...)
        const documentId = req.body?.documentId
            || req.params?.documentId
            || (req.query?.id as string);

        if (!documentId) {
            return res.status(400).json({
                error: 'Document ID is required. Pass as body.documentId, route param, or query ?id='
            });
        }

        // Decode URI-encoded document IDs (e.g., files%2F123 -> files/123)
        const decodedId = decodeURIComponent(documentId);

        const result = await geminiService.deleteDocument(decodedId);
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

export const deleteAllDocuments = async (req: Request, res: Response) => {
    try {
        const result = await geminiService.deleteAllDocuments();
        res.json(result);
    } catch (error: any) {
        console.error('Error deleting all documents:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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

export const getConversationHistory = async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const history = geminiService.getConversationHistory(sessionId);
        res.json({ sessionId, history, total: history.length });
    } catch (error: any) {
        console.error('Error getting conversation history:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const clearSession = async (req: Request, res: Response) => {
    try {
        const sessionId = req.params.sessionId as string;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        geminiService.clearSession(sessionId);
        res.json({ message: 'Session cleared successfully', sessionId });
    } catch (error: any) {
        console.error('Error clearing session:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const getSessionStats = async (req: Request, res: Response) => {
    try {
        const stats = geminiService.getSessionStats();
        res.json(stats);
    } catch (error: any) {
        console.error('Error getting session stats:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
