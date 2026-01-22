import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as ragController from '../controllers/ragController';

const router = Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync('src/uploads')) {
    fs.mkdirSync('src/uploads', { recursive: true });
}

router.post('/index', upload.single('file'), ragController.indexDocument);
router.post('/search', ragController.search);

export default router;
