import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as ragController from '../controllers/ragController';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists with proper permissions
const uploadsDir = 'src/uploads/';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF and text files
        const allowedTypes = ['application/pdf', 'text/plain', 'text/html', 'application/msword'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and text files are allowed'));
        }
    }
});

router.post('/index', upload.single('file'), ragController.indexDocument);
router.post('/search', ragController.search);
router.get('/documents', ragController.listDocuments);
router.delete('/documents/:documentId', ragController.deleteDocument);
router.get('/store-info', ragController.getStoreInfo);

// Session management routes
router.get('/sessions/:sessionId/history', ragController.getConversationHistory);
router.delete('/sessions/:sessionId', ragController.clearSession);
router.get('/sessions/stats', ragController.getSessionStats);

export default router;
