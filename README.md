# 🏥 Banned Pharma RAG Explorer — Government of India Pharmaceutical Regulatory Compliance API

A production-ready RAG (Retrieval-Augmented Generation) system built with **Google Gemini API File Search**, designed to help users check whether a medicine is **banned, restricted, or approved** in India based on official CDSCO regulatory documents.

---

## 🎯 What This Does

Upload official pharmaceutical regulatory documents (CDSCO banned drug lists, Indian Gazette notifications, state drugs department circulars, etc.) and then **search by medicine name** to get a structured JSON response with:

- ✅ **Ban status** — Is the medicine banned, approved, scheduled, controlled, or unknown?
- 📋 **Gazette references** — GSR numbers, notification dates, issuing authorities
- 💊 **Drug category** — Single drug, FDC (Fixed Dose Combination), or import-banned
- 📅 **Ban/Uplift dates** — When was it banned? Was the ban lifted?
- 📝 **Detailed reasons** — Why it was banned, under which act/section
- 🔄 **Alternative medicines** — Recommendations from the documents
- 📑 **Source attribution** — Which PDF file the information came from

---

## 📂 Sample Data

The `data/` folder contains sample banned drug PDF documents that can be uploaded to the system:

| File | Description |
|------|-------------|
| `banned-drugs-cdsco-1940.pdf` | CDSCO banned drugs list under the Drugs and Cosmetics Act, 1940 |
| `cdsco_banned_01Jan2018.pdf` | CDSCO consolidated banned drugs list (January 2018) |
| `delhi.pdf` | Delhi State Drugs Department banned drugs circular |

---

## ✨ Features

### 🔍 Pharmaceutical Regulatory Search
- **Medicine Lookup**: Search any medicine name to check if it's banned in India
- **Fuzzy Matching**: Handles typos and spelling variations (e.g., "paracemotol" → "paracetamol")
- **FDC Awareness**: Distinguishes between individual drug bans and FDC (combination) bans
- **Chronological Analysis**: Checks for ban uplift notifications — the latest notification takes precedence
- **Multi-document Search**: Cross-references across all uploaded regulatory documents

### 🤖 AI-Powered Analysis
- **Structured JSON Output**: Returns well-formatted JSON matching the regulatory compliance format
- **Source Citations**: Every response attributes information to the source PDF document
- **Anti-Hallucination**: Strict rules prevent fabrication of gazette numbers, dates, or reasons
- **Contextual Sessions**: Maintains conversation history for follow-up questions

### 📊 Document Management
- **Upload & Index**: Upload PDF regulatory documents with metadata
- **List Documents**: View all indexed documents
- **Delete Single Document**: Remove specific documents from the store
- **Delete All Documents**: Clear all documents from both Gemini and local storage
- **Persistent Storage**: Documents survive server restarts

---

## 🚀 Getting Started

### 1. Setup
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
PORT=3101
STORE_NAME=banned-pharma-rag-store
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Run the Application

#### Development Mode
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm start
```

### 4. Run with Docker

#### Development Environment
```bash
docker-compose up --build
```

#### Using Deployment Script
```bash
./deploy.sh
```

**Access Points:**
- **Backend API**: `http://localhost:3101`

#### Docker Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate

# Clean up
docker-compose down -v --remove-orphans
```

---

## 📚 API Documentation

### 1. Upload & Index Document
Upload a banned drug PDF and index it for RAG search.

**Endpoint:** `POST /api/index`
**Content-Type:** `multipart/form-data`

**Curl Request:**
```bash
curl -X POST http://localhost:3101/api/index \
  -F "file=@data/banned-drugs-cdsco-1940.pdf" \
  -F 'metadata={"source": "CDSCO", "type": "banned_drugs_list", "year": "1940"}'
```

**Response:**
```json
{
  "message": "Document indexed successfully",
  "result": {
    "done": true,
    "response": {
      "documentName": "fileSearchStores/xxx/documents/yyy"
    }
  }
}
```

### 2. Search Medicine Status
Search whether a medicine is banned in India. Returns structured JSON per the regulatory compliance format.

**Endpoint:** `POST /api/search`
**Content-Type:** `application/json`

**Curl Request:**
```bash
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Is paracetamol banned in India?",
    "sessionId": "pharma-session-001"
  }'
```

**Expected Response (from AI):**
```json
{
  "text": "{\"query\":\"Is paracetamol banned in India?\",\"medicine_searched\":\"Paracetamol\",\"total_results\":1,\"current_status\":\"open\",\"results\":[{\"gazette_id\":\"N/A\",\"pdf_name\":\"banned-drugs-cdsco-1940.pdf\",\"medicine_name\":\"Paracetamol\",\"date_of_ban\":\"N/A\",\"date_of_uplift\":\"N/A\",\"details\":\"Paracetamol itself is NOT banned in India. However, certain Fixed Dose Combinations (FDCs) containing paracetamol have been banned.\",\"reasons_for_ban\":\"N/A\",\"reasons_for_uplift\":\"N/A\",\"drug_category\":\"single_drug\",\"population_restriction\":\"none\",\"schedule_classification\":\"Schedule H\",\"controlled_status\":\"Not controlled\",\"source_authority\":\"CDSCO\",\"act_reference\":\"Drugs and Cosmetics Act 1940\",\"alternative_medicines\":\"Not specified in documents\",\"compliance_note\":\"N/A\"}],\"summary\":\"Paracetamol is not banned in India. It is a widely available over-the-counter and prescription analgesic.\",\"disclaimer\":\"This information is based on regulatory documents available in the system. For the latest regulatory status, always verify with the official CDSCO website (cdsco.gov.in) or the e-Gazette portal (egazette.gov.in). This is not medical or legal advice.\"}",
  "groundingMetadata": {},
  "sessionId": "pharma-session-001"
}
```

**More Search Examples:**
```bash
# Check banned drug
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Is nimesulide banned in India?"}'

# Check FDC ban
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Tell me about phenylpropanolamine ban"}'

# Check controlled substance
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Is tramadol a controlled substance?"}'

# List recent bans
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Which drugs were banned in the latest notification?"}'
```

### 3. List All Documents
Get all indexed regulatory documents.

**Endpoint:** `GET /api/documents`

**Curl Request:**
```bash
curl -X GET http://localhost:3101/api/documents
```

**Response:**
```json
{
  "documents": [
    {
      "name": "fileSearchStores/xxx/documents/yyy",
      "displayName": "banned-drugs-cdsco-1940.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 34703,
      "createTime": "2026-02-16T10:30:00Z",
      "metadata": [
        {"key": "source", "stringValue": "CDSCO"},
        {"key": "type", "stringValue": "banned_drugs_list"},
        {"key": "year", "stringValue": "1940"}
      ],
      "state": "ACTIVE"
    }
  ],
  "total": 1
}
```

### 4. Delete a Single Document
Delete a specific regulatory document by its Gemini document name.

**Endpoint:** `POST /api/documents/delete`
**Content-Type:** `application/json`

**Curl Request (recommended — send document name in body):**
```bash
# Use the full document name from the list API response
curl -X POST http://localhost:3101/api/documents/delete \
  -H "Content-Type: application/json" \
  -d '{"documentId": "fileSearchStores/xxx/documents/yyy"}'
```

**Alternative: DELETE with URL-encoded path param (for simple IDs):**
```bash
curl -X DELETE "http://localhost:3101/api/documents/simple-doc-id"
```

**Response:**
```json
{
  "message": "Document deleted successfully",
  "document": {
    "name": "fileSearchStores/xxx/documents/yyy",
    "displayName": "banned-drugs-cdsco-1940.pdf"
  }
}
```

### 5. Delete All Documents
Delete all documents from both Gemini store and local storage.

**Endpoint:** `DELETE /api/documents/all`

**Curl Request:**
```bash
curl -X DELETE http://localhost:3101/api/documents/all
```

**Response:**
```json
{
  "message": "All documents deleted",
  "geminiDeleted": 3,
  "geminiFailed": 0,
  "localDeleted": 3,
  "details": [
    {"name": "fileSearchStores/xxx/documents/doc1", "success": true},
    {"name": "fileSearchStores/xxx/documents/doc2", "success": true},
    {"name": "fileSearchStores/xxx/documents/doc3", "success": true}
  ]
}
```

### 6. Store Information
Get information about the Gemini file search store.

**Endpoint:** `GET /api/store-info`

**Curl Request:**
```bash
curl -X GET http://localhost:3101/api/store-info
```

**Response:**
```json
{
  "storeName": "fileSearchStores/abcd1234",
  "displayName": "banned-pharma-rag-store",
  "documentsCount": 3
}
```

### 7. Session Management

#### Get Conversation History
```bash
curl -X GET http://localhost:3101/api/sessions/pharma-session-001/history
```

**Response:**
```json
{
  "sessionId": "pharma-session-001",
  "history": [
    {
      "role": "user",
      "content": "Is paracetamol banned?",
      "timestamp": "2026-02-16T10:30:00.000Z"
    },
    {
      "role": "model",
      "content": "{...structured JSON response...}",
      "timestamp": "2026-02-16T10:30:02.000Z"
    }
  ],
  "total": 2
}
```

#### Clear Session
```bash
curl -X DELETE http://localhost:3101/api/sessions/pharma-session-001
```

#### Get Session Statistics
```bash
curl -X GET http://localhost:3101/api/sessions/stats
```

**Response:**
```json
{
  "totalSessions": 5,
  "activeSessions": 3
}
```

### 8. Health Check
```bash
curl -X GET http://localhost:3101/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## 🏗️ Project Structure

```
├── src/
│   ├── services/
│   │   ├── geminiService.ts    # Core Gemini API integration (upload, search, delete, list)
│   │   └── sessionManager.ts   # Conversation session management
│   ├── controllers/
│   │   └── ragController.ts    # Express request handlers
│   ├── routes/
│   │   └── ragRoutes.ts        # Express route definitions
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── data/                   # Persistent document metadata (documents.json)
│   ├── uploads/                # Temporary file uploads (cleaned after indexing)
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Application entry point
├── data/                       # Sample regulatory PDFs for upload
│   ├── banned-drugs-cdsco-1940.pdf
│   ├── cdsco_banned_01Jan2018.pdf
│   └── delhi.pdf
├── COPY_PASTE_PROMPTS.md       # System prompt for pharmaceutical regulatory AI
├── docker-compose.yml          # Docker deployment
├── deploy.sh                   # Automated deployment script
├── .env                        # Environment variables
├── .env.example                # Environment template
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

---

## 🔄 Quick Start: Upload Sample Data & Search

### Step 1: Start the server
```bash
npm run dev
```

### Step 2: Upload all sample PDFs
```bash
# Upload CDSCO 1940 banned drugs list
curl -X POST http://localhost:3101/api/index \
  -F "file=@data/banned-drugs-cdsco-1940.pdf" \
  -F 'metadata={"source": "CDSCO", "type": "banned_drugs_list", "document": "Drugs and Cosmetics Act 1940"}'

# Upload CDSCO 2018 consolidated list
curl -X POST http://localhost:3101/api/index \
  -F "file=@data/cdsco_banned_01Jan2018.pdf" \
  -F 'metadata={"source": "CDSCO", "type": "banned_drugs_consolidated", "year": "2018"}'

# Upload Delhi state circular
curl -X POST http://localhost:3101/api/index \
  -F "file=@data/delhi.pdf" \
  -F 'metadata={"source": "Delhi State Drugs Department", "type": "state_circular"}'
```

### Step 3: Verify documents are indexed
```bash
curl -X GET http://localhost:3101/api/documents
```

### Step 4: Search for banned medicines
```bash
# Check if a specific medicine is banned
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Is nimesulide banned in India?"}'

# Check FDC bans
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Which fixed dose combinations containing paracetamol are banned?"}'

# General query
curl -X POST http://localhost:3101/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "List all drugs banned under Section 26A of the Drugs and Cosmetics Act"}'
```

---

## 📊 Expected Search Output Format

Every search response returns structured JSON following the Government of India Pharmaceutical Regulatory Compliance format:

```json
{
  "query": "user's original query",
  "medicine_searched": "corrected/standardized medicine name",
  "total_results": 1,
  "current_status": "banned | approved | scheduled | controlled | open | unknown",
  "results": [
    {
      "gazette_id": "GSR 91(E) — or N/A if not found",
      "pdf_name": "source PDF filename",
      "medicine_name": "Full medicine name as in document",
      "date_of_ban": "DD MMM YYYY — or N/A",
      "date_of_uplift": "DD MMM YYYY — or N/A",
      "details": "Comprehensive paragraph from documents",
      "reasons_for_ban": "Specific reasons from documents",
      "reasons_for_uplift": "N/A if not lifted",
      "drug_category": "single_drug | fdc | import_banned",
      "population_restriction": "all | children | women | none",
      "schedule_classification": "Schedule H | H1 | X | Not Scheduled",
      "controlled_status": "NDPS controlled | Not controlled",
      "source_authority": "CDSCO, Ministry of Health, etc.",
      "act_reference": "Drugs and Cosmetics Act 1940 Section 26A",
      "alternative_medicines": "From documents or 'Not specified'",
      "compliance_note": "Penalties, transition periods, etc."
    }
  ],
  "summary": "2-3 line human-readable summary",
  "disclaimer": "Verification advisory with official website links"
}
```

---

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key (required) | — |
| `PORT` | Backend server port | `3101` |
| `STORE_NAME` | Gemini file search store name | `banned-pharma-rag-store` |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.5-flash` |

---

## 🧪 Testing

### Quick API Test
```bash
# Health check
curl http://localhost:3101/health

# List documents
curl http://localhost:3101/api/documents

# Store info
curl http://localhost:3101/api/store-info
```

### Full Integration Test
1. Start the server with `npm run dev`
2. Upload all 3 sample PDFs from the `data/` folder (see Quick Start above)
3. Search for known banned drugs (e.g., nimesulide, phenylpropanolamine)
4. Verify the response format matches the expected output
5. Test delete single document and delete all documents
6. Verify documents are removed from both Gemini store and local storage

---

## 📄 License
MIT License

## 🤝 Contributing
Contributions are welcome. Please follow standard GitHub contribution guidelines.

---

*Built for pharmaceutical regulatory compliance and drug safety awareness in India 🇮🇳*