import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL: GEMINI_API_KEY is not defined in .env file');
    process.exit(1);
}

export const config = {
    geminiApiKey: process.env.GEMINI_API_KEY,
    port: process.env.PORT || 3000,
    storeName: process.env.STORE_NAME || 'gemini-rag-store',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
};
