# NCERT RAG Explorer - Education Hackathon Solution

A production-ready RAG (Retrieval-Augmented Generation) system built with Google's Gemini API File Search, specifically designed for NCERT chapter management and AI-powered educational assistance.

## 🎯 Hackathon Theme: Innovation for Education Equity

This solution addresses the need for accessible, AI-powered educational tools that can help students and teachers interact with NCERT content more effectively. Built for the **Innovation for Education Equity Hackathon** as part of the Shikshagraha movement.

## ✨ Features

### 🎓 Education-Focused
- **NCERT Chapter Management**: Upload and organize chapters by book, class, and subject
- **Smart Metadata**: Automatic categorization with book, class, and chapter information
- **Educational UI**: Dashboard designed specifically for educational content
- **Persistent Storage**: Documents survive server restarts with file-based persistence

### 🤖 AI-Powered Search
- **Semantic Search**: Ask questions in natural language about any uploaded chapter
- **Contextual Answers**: Get precise answers with source citations
- **Smart Suggestions**: Pre-built question templates for common educational queries
- **Metadata Filtering**: Filter searches by book, class, or other criteria

### 📊 Dashboard Interface
- **Modern UI**: Glassmorphic design with responsive layout
- **Chapter Library**: Visual grid of all uploaded chapters with filtering
- **Upload Progress**: Real-time feedback during chapter indexing
- **Statistics**: Track total chapters and recent uploads
- **Chapter Details Modal**: Professional modal with comprehensive chapter information

### 🔧 Technical Excellence
- **Managed RAG**: No vector database required (handled by Google)
- **Cost Effective**: Free storage and query-time embeddings
- **Production Ready**: Docker support with full-stack deployment
- **Fixed Store Names**: Consistent Gemini store naming across restarts
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality

## 🚀 Getting Started

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
PORT=1000
STORE_NAME=ncert-rag-store-fixed
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Run the Application

#### Development Mode
Start the backend:
```bash
npm run dev
```

Start the frontend:
```bash
cd frontend
npm run dev
```

#### Production Build
```bash
npm run build
cd frontend && npm run build
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
- **Frontend**: `http://localhost:3002`
- **Backend API**: `http://localhost:3001`

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

## 📚 API Documentation

### 1. Index Chapter
Upload and index an NCERT chapter with metadata.

**Endpoint:** `POST /api/index`  
**Content-Type:** `multipart/form-data`

**Curl Request:**
```bash
curl -X POST http://localhost:3001/api/index \
  -F "file=@/path/to/NCERT_Class10_Science_Chapter_1.pdf" \
  -F 'metadata={"book": "science", "class": "10", "chapter": "Light - Reflection and Refraction"}'
```

### 2. Search Chapters
Perform semantic search across indexed chapters with optional filtering.

**Endpoint:** `POST /api/search`  
**Content-Type:** `application/json`

**Curl Request:**
```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is photosynthesis and how does it work?",
    "filter": "book=\"science\""
  }'
```

### 3. List Chapters
Get all indexed chapters with metadata and statistics.

**Endpoint:** `GET /api/documents`

**Curl Request:**
```bash
curl -X GET http://localhost:3001/api/documents
```

**Response:**
```json
{
  "documents": [
    {
      "name": "files/1234567890-chapter1.pdf",
      "displayName": "chapter1.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576,
      "createTime": "2026-01-22T10:30:00Z",
      "metadata": [
        {"key": "book", "stringValue": "science"},
        {"key": "class", "stringValue": "10"},
        {"key": "chapter", "stringValue": "Light - Reflection and Refraction"}
      ],
      "state": "ACTIVE"
    }
  ],
  "total": 1
}
```

### 4. Delete Chapter
Delete a specific indexed chapter.

**Endpoint:** `DELETE /api/documents/:documentId`

**Curl Request:**
```bash
curl -X DELETE http://localhost:3001/api/documents/files%2F1234567890-chapter1.pdf
```

**Response:**
```json
{
  "message": "Document deleted successfully",
  "document": {
    "name": "files/1234567890-chapter1.pdf",
    "displayName": "chapter1.pdf"
  }
}
```

### 5. Store Information
Get information about the Gemini store.

**Endpoint:** `GET /api/store-info`

**Curl Request:**
```bash
curl -X GET http://localhost:3001/api/store-info
```

### 6. Health Check
Check if the backend service is running.

**Endpoint:** `GET /health`

**Curl Request:**
```bash
curl -X GET http://localhost:3001/health
```

## 🏗️ Project Structure

```
├── src/
│   ├── services/geminiService.ts    # Core Gemini API integration with persistence
│   ├── controllers/ragController.ts # API request handling
│   ├── routes/ragRoutes.ts         # Express routes
│   ├── config/env.ts               # Environment configuration
│   ├── data/                       # Persistent document storage
│   └── server.ts                   # Application entry point
├── frontend/
│   ├── src/
│   │   ├── main.js                 # Frontend application logic
│   │   ├── style.css               # Glassmorphic UI styles
│   │   └── config.js               # Environment-aware API configuration
│   ├── index.html                  # Dashboard interface
│   └── package.json                # Frontend dependencies
├── docker-compose.yml              # Full-stack deployment
├── deploy.sh                       # Automated deployment script
└── README.md                       # This file
```

## 🎯 Educational Use Cases

### For Students
- **Quick Answers**: Get instant explanations of complex concepts
- **Chapter Summaries**: Understand key points from any chapter
- **Concept Clarification**: Ask follow-up questions for better understanding
- **Interactive Learning**: Chat with chapters for personalized learning

### For Teachers
- **Lesson Planning**: Extract key concepts and examples from chapters
- **Question Generation**: Create quiz questions based on chapter content
- **Content Organization**: Manage and categorize educational materials
- **Student Support**: Help students find specific information quickly

### For Administrators
- **Content Management**: Track and organize institutional educational resources
- **Usage Analytics**: Monitor which chapters and topics are most accessed
- **Quality Assurance**: Ensure comprehensive coverage of curriculum topics
- **Resource Planning**: Understand content usage patterns

## 🔮 Technical Features

### Data Persistence
- **File-based Storage**: Documents persist across server restarts
- **Fixed Store Names**: Consistent Gemini store identification
- **Metadata Tracking**: Complete document information storage
- **Backup Ready**: JSON-based storage for easy backup/restore

### UI/UX Enhancements
- **Professional Modals**: Beautiful chapter details with comprehensive information
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark Theme**: Eye-friendly glassmorphic design
- **Interactive Filters**: Smart filtering by book, class, and other criteria
- **Real-time Updates**: Automatic refresh after operations

### Performance Optimizations
- **Efficient Caching**: Smart document caching for faster access
- **Optimized Builds**: Production-ready Docker containers
- **Health Monitoring**: Built-in health checks for reliability
- **Error Handling**: Comprehensive error handling and user feedback

## 🏆 Hackathon Alignment

This solution directly addresses the **Innovation for Education Equity** theme by:

1. **Accessibility**: Making NCERT content searchable and interactive
2. **Equity**: Providing free, AI-powered educational assistance
3. **Innovation**: Leveraging cutting-edge RAG technology for education
4. **Scalability**: Built to handle content from multiple classes and subjects
5. **Open Source**: Designed as a digital public good for educational institutions
6. **Persistence**: Reliable data storage for institutional use

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `PORT`: Backend server port (default: 1000)
- `STORE_NAME`: Gemini file search store name (default: ncert-rag-store-fixed)
- `GEMINI_MODEL`: Gemini model to use (default: gemini-2.5-flash)

### Port Configuration
- **Backend**: Port 3001
- **Frontend**: Port 3002 (Docker), Port 5173 (Development)

## 🧪 Testing

### Manual Testing
1. Upload a chapter using the Upload Chapter section
2. Go to "My Chapters" section to view uploaded chapters
3. Click "Details" button to see comprehensive chapter information
4. Use "Smart Search" to ask questions about uploaded content
5. Test filtering by book and class
6. Try deleting chapters and verify persistence

### API Testing
```bash
# Test health check
curl http://localhost:3001/health

# Test document listing
curl http://localhost:3001/api/documents

# Test store information
curl http://localhost:3001/api/store-info
```

## 📄 License
MIT License - Built for educational equity and open collaboration.

## 🤝 Contributing
This project is open for contributions to improve educational accessibility. Please follow standard GitHub contribution guidelines.

---

*Built with ❤️ for the Innovation for Education Equity Hackathon 2026*
*Empowering 1 million public schools through AI-powered educational tools*