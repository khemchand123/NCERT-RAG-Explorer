# Gemini File Search RAG System

A production-ready RAG (Retrieval-Augmented Generation) system built with Google's Gemini API File Search. This project features a structured Node.js backend and a premium glassmorphic frontend.

## Features

- **Managed RAG**: No vector database required (handled by Google).
- **Metadata Support**: Index documents with custom metadata and filter searches.
- **Premium UI**: Modern, responsive interface for document management and search.
- **Cost Effective**: Free storage and query-time embeddings.

## Getting Started

### 1. Setup
Clone the repository and install dependencies:
```bash
npm install
cd frontend && npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
STORE_NAME=my-rag-store
```

### 3. Run the Application
Start the backend:
```bash
npm run dev
```

Start the frontend:
```bash
cd frontend
npm run dev
```

### 4. Run with Docker
You can also run the entire stack using Docker Compose:
```bash
docker-compose up --build
```
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:8080`

## API Documentation

### 1. Index Document
Upload and index a file with optional metadata.

**Endpoint:** `POST /api/index`  
**Content-Type:** `multipart/form-data`

**Curl Request:**
```bash
curl -X POST http://localhost:3000/api/index \
  -F "file=@/home/khem-chand/Downloads/NCERT_Class10_Science_Chapter_1.pdf" \
  -F 'metadata={"doc_type": "manual", "version": "1.0"}'
```

---

### 2. Search
Perform a semantic search across indexed documents with optional filtering.

**Endpoint:** `POST /api/search`  
**Content-Type:** `application/json`

**Curl Request:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Can you summarize the content on page 5",
    "filter": "doc_type=\"manual\""
  }'
```

## Project Structure

- `src/services/geminiService.ts`: Core logic for Gemini API interaction.
- `src/controllers/ragController.ts`: API request handling and metadata parsing.
- `frontend/`: Premium Vanilla JS + Vite frontend application.

## License
MIT
