# NCERT RAG Explorer - Technical Implementation Guide
## Theme 1: On-The-Go Teacher Support System

> **For Technical Reviewers & Judges**  
> Deep dive into architecture, implementation choices, and scalability considerations

---

## 🏗️ System Architecture

### **High-Level Design**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌────────────────────┐          ┌────────────────────────────┐   │
│  │  React Frontend    │          │  Progressive Web App       │   │
│  │  (Vite + Tailwind) │◄────────►│  (Offline Capabilities)   │   │
│  └──────────┬─────────┘          └────────────────────────────┘   │
│             │                                                       │
│             │ HTTPS/REST API                                       │
└─────────────┼───────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                           │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Node.js + Express + TypeScript                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Upload API   │  │  Chat API    │  │  Metadata API   │ │   │
│  │  │ (Multer)     │  │  (RAG)       │  │  (CRUD)         │ │   │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │   │
│  └───────────────────────────┬────────────────────────────────┘   │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA & AI LAYER                                │
│  ┌─────────────────────────┐     ┌──────────────────────────────┐ │
│  │  Local File Storage     │     │  Google Gemini Platform      │ │
│  │  ┌────────────────────┐ │     │  ┌────────────────────────┐ │ │
│  │  │ documents.json     │ │     │  │  FileSearch API       │ │ │
│  │  │ (Metadata Store)   │ │     │  │  (Vector Embeddings)  │ │ │
│  │  └────────────────────┘ │     │  └────────────────────────┘ │ │
│  │  ┌────────────────────┐ │     │  ┌────────────────────────┐ │ │
│  │  │ uploads/           │ │     │  │  Gemini 2.5 Flash     │ │ │
│  │  │ (PDF Cache)        │ │     │  │  (Generation Model)   │ │ │
│  │  └────────────────────┘ │     │  └────────────────────────┘ │ │
│  └─────────────────────────┘     └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Components Deep Dive

### **1. Document Processing Pipeline**

#### **Upload Flow**
```typescript
// src/routes/upload.ts
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // 1. Validation Layer
    const { file } = req;
    if (!file || file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    // 2. Metadata Extraction
    const metadata = {
      bookName: req.body.bookName,
      className: req.body.className,
      subject: req.body.subject,
      chapter: req.body.chapter,
      uploadedAt: new Date().toISOString()
    };

    // 3. Google FileSearch Indexing
    const uploadResult = await genai.files.create({
      file: {
        path: file.path,
        mimeType: 'application/pdf'
      },
      vectorStore: process.env.STORE_NAME
    });

    // 4. Persistence
    await saveDocumentMetadata({
      ...metadata,
      geminiFileId: uploadResult.name,
      fileName: file.originalname,
      fileSize: file.size
    });

    // 5. Response
    res.json({
      success: true,
      documentId: uploadResult.name,
      metadata
    });
  } catch (error) {
    logger.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload processing failed' });
  }
});
```

#### **Why This Design?**
- **Separation of Concerns**: Validation → Processing → Storage → Response
- **Error Isolation**: Each step can fail independently with proper error handling
- **Auditability**: Every upload logged with timestamp, user metadata
- **Scalability**: Async processing allows handling multiple uploads concurrently

---

### **2. RAG Query Engine**

#### **Query Processing Flow**
```typescript
// src/services/ragService.ts
class RAGService {
  async processQuery(question: string, filters: DocumentFilters) {
    // Step 1: Build Context-Aware Prompt
    const systemPrompt = this.buildSystemPrompt(filters);
    const enhancedQuestion = this.enhanceQuery(question, filters);

    // Step 2: Retrieve Relevant Documents
    const retrievedDocs = await this.vectorSearch(enhancedQuestion, filters);

    // Step 3: Generate Response with Citations
    const response = await genai.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enhancedQuestion }
      ],
      tools: [{
        type: 'file_search',
        vector_store_ids: [process.env.STORE_NAME],
        metadata_filters: this.buildMetadataFilter(filters)
      }],
      temperature: 0.7, // Balance creativity and accuracy
      max_tokens: 2048
    });

    // Step 4: Post-Process Response
    return this.formatResponse(response, retrievedDocs);
  }

  private buildSystemPrompt(filters: DocumentFilters): string {
    return `You are an expert pedagogical assistant for Indian government school teachers.

CONTEXT:
- Target Audience: ${filters.className || 'All Classes'} teachers
- Subject Focus: ${filters.subject || 'All Subjects'}
- Curriculum: NCERT (National Council of Educational Research and Training)

RESPONSE GUIDELINES:
1. Ground all answers in NCERT curriculum - cite specific chapters, pages, examples
2. Provide actionable teaching strategies appropriate for resource-constrained classrooms
3. Use Socratic method - guide teachers to discover solutions, don't just give answers
4. Consider multi-grade classrooms, large class sizes (40-60 students), limited materials
5. Promote conceptual understanding over rote memorization (align with NEP 2020)

FORMAT:
📖 NCERT Reference: [Exact chapter/page]
🎯 Teaching Strategy: [Concrete classroom approach]
🔍 Core Concept: [Simple explanation]
📝 Suggested Activity: [Low-resource, high-impact]
💡 Teacher Tip: [Practical advice based on ground realities]

CONSTRAINTS:
- Keep language simple (avoid academic jargon)
- Suggest activities using locally available materials (sticks, stones, paper)
- Acknowledge classroom management challenges
- Provide differentiation strategies for mixed-ability groups`;
  }

  private enhanceQuery(question: string, filters: DocumentFilters): string {
    let enhanced = question;

    // Add context from filters
    if (filters.className) {
      enhanced = `For ${filters.className} students: ${enhanced}`;
    }
    if (filters.subject) {
      enhanced = `In ${filters.subject}: ${enhanced}`;
    }

    // Add implicit context
    enhanced += `\n\nProvide answer grounded in NCERT curriculum with specific citations.`;

    return enhanced;
  }

  private buildMetadataFilter(filters: DocumentFilters) {
    const metadataFilter: any = {};

    if (filters.className) {
      metadataFilter.className = { equals: filters.className };
    }
    if (filters.subject) {
      metadataFilter.subject = { equals: filters.subject };
    }
    if (filters.bookName) {
      metadataFilter.bookName { equals: filters.bookName };
    }

    return metadataFilter;
  }

  private formatResponse(rawResponse: any, docs: Document[]): FormattedResponse {
    const content = rawResponse.choices[0].message.content;

    // Extract citations from response
    const citations = this.extractCitations(content);

    // Add document sources
    const sources = docs.map(doc => ({
      title: doc.metadata.chapter,
      book: doc.metadata.bookName,
      class: doc.metadata.className,
      page: this.extractPageNumber(doc.content)
    }));

    return {
      answer: content,
      citations,
      sources,
      confidence: rawResponse.usage.confidence || 0.85,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

### **3. Metadata Management System**

#### **Persistent Storage Strategy**
```typescript
// src/services/documentStore.ts
interface DocumentMetadata {
  id: string;
  geminiFileId: string;
  bookName: string;
  className: string;
  subject: string;
  chapter: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  tags?: string[];
}

class DocumentStore {
  private filePath = './data/documents.json';
  private cache: Map<string, DocumentMetadata> = new Map();

  async initialize() {
    // Load existing documents on startup
    if (fs.existsSync(this.filePath)) {
      const data = await fs.promises.readFile(this.filePath, 'utf-8');
      const documents = JSON.parse(data);
      documents.forEach(doc => this.cache.set(doc.id, doc));
      console.log(`Loaded ${this.cache.size} documents from storage`);
    }
  }

  async save(metadata: DocumentMetadata): Promise<void> {
    // Add to cache
    this.cache.set(metadata.id, metadata);

    // Persist to disk
    const allDocs = Array.from(this.cache.values());
    await fs.promises.writeFile(
      this.filePath,
      JSON.stringify(allDocs, null, 2),
      'utf-8'
    );
  }

  async search(filters: Partial<DocumentMetadata>): Promise<DocumentMetadata[]> {
    let results = Array.from(this.cache.values());

    if (filters.className) {
      results = results.filter(doc => doc.className === filters.className);
    }
    if (filters.subject) {
      results = results.filter(doc => doc.subject === filters.subject);
    }
    if (filters.bookName) {
      results = results.filter(doc => doc.bookName === filters.bookName);
    }

    return results;
  }

  async delete(id: string): Promise<boolean> {
    if (this.cache.has(id)) {
      this.cache.delete(id);
      await this.persistChanges();
      return true;
    }
    return false;
  }

  private async persistChanges() {
    const allDocs = Array.from(this.cache.values());
    await fs.promises.writeFile(
      this.filePath,
      JSON.stringify(allDocs, null, 2),
      'utf-8'
    );
  }
}
```

**Why JSON File Storage?**
- ✅ **Simplicity**: No database setup required for MVP
- ✅ **Portability**: Easy to backup, version control, migrate
- ✅ **Transparency**: Human-readable for debugging
- ✅ **Sufficient for Scale**: 10,000 documents = ~2MB JSON file
- 🔄 **Future Migration Path**: Can swap to PostgreSQL/MongoDB when needed

---

## 🎨 Frontend Architecture

### **Component Hierarchy**
```
App (Root)
├── Router
│   ├── Dashboard
│   │   ├── Header (Search, Upload Button)
│   │   ├── StatisticsPanel (Total Docs, Recent Uploads)
│   │   ├── FilterBar (Class, Subject, Book dropdowns)
│   │   └── ChapterGrid
│   │       └── ChapterCard (x N documents)
│   │           ├── Thumbnail
│   │           ├── Metadata (Book, Class, Subject)
│   │           ├── ActionButtons (View, Delete)
│   │           └── Modal (Chapter Details)
│   │
│   ├── ChatInterface
│   │   ├── QueryInput (Textarea + Submit)
│   │   ├── ExampleQueries (Quick Templates)
│   │   ├── FilterPanel (Class/Subject Selection)
│   │   ├── ResponseDisplay
│   │   │   ├── MarkdownRenderer
│   │   │   ├── CitationLinks
│   │   │   └── RelatedQuestions
│   │   └── ConversationHistory
│   │
│   └── UploadModal
│       ├── FileDropzone
│       ├── MetadataForm (Book, Class, Subject, Chapter)
│       ├── ProgressBar
│       └── SuccessMessage
```

### **State Management Pattern**
```typescript
// frontend/src/hooks/useDocuments.ts
function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    fetchDocuments(filters);
  }, [filters]);

  const fetchDocuments = async (filters: Filters) => {
    setLoading(true);
    try {
      const response = await api.get('/api/documents', { params: filters });
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, metadata: Metadata) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const response = await api.post('/api/upload', formData, {
      onUploadProgress: (progress) => {
        // Update progress bar
      }
    });

    // Refresh document list
    await fetchDocuments(filters);
    return response.data;
  };

  return {
    documents,
    loading,
    filters,
    setFilters,
    uploadDocument
  };
}
```

---

## 🚀 Deployment & DevOps

### **Docker Multi-Stage Build**
```dockerfile
# Stage 1: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Copy backend artifacts
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy frontend artifacts
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Setup non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose ports
EXPOSE 3101 3102

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3101/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "backend/dist/server.js"]
```

### **Docker Compose Configuration**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ncert-backend
    restart: unless-stopped
    ports:
      - "3101:3101"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PORT=3101
      - STORE_NAME=${STORE_NAME}
      - NODE_ENV=production
    volumes:
      - ./data:/app/data  # Persistent metadata storage
      - ./uploads:/app/uploads  # PDF cache
    networks:
      - ncert-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3101/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ncert-frontend
    restart: unless-stopped
    ports:
      - "3102:3102"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:3101
    networks:
      - ncert-network

networks:
  ncert-network:
    driver: bridge
```

---

## 📊 Performance Optimization

### **Backend Optimizations**

#### **1. Response Caching**
```typescript
// Cache frequent queries
const cache = new Map<string, CachedResponse>();
const CACHE_TTL = 3600000; // 1 hour

async function getCachedOrQuery(question: string, filters: Filters) {
  const cacheKey = `${question}:${JSON.stringify(filters)}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.response;
    }
  }

  const response = await ragService.processQuery(question, filters);
  cache.set(cacheKey, { response, timestamp: Date.now() });
  return response;
}
```

#### **2. Concurrent Upload Processing**
```typescript
// Process multiple uploads in parallel
async function bulkUpload(files: File[], metadata: Metadata[]) {
  const uploadPromises = files.map((file, index) => 
    uploadSingleFile(file, metadata[index])
  );

  const results = await Promise.allSettled(uploadPromises);
  
  return {
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    details: results
  };
}
```

#### **3. Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many queries, please try again later'
});

app.use('/api/chat', chatLimiter);
```

### **Frontend Optimizations**

#### **1. Code Splitting**
```typescript
// Lazy load heavy components
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const UploadModal = lazy(() => import('./components/UploadModal'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/upload" element={<UploadModal />} />
      </Routes>
    </Suspense>
  );
}
```

#### **2. Virtual Scrolling for Large Lists**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function ChapterGrid({ documents }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Estimated card height
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      {virtualizer.getVirtualItems().map(item => (
        <ChapterCard key={item.key} document={documents[item.index]} />
      ))}
    </div>
  );
}
```

---

## 🔐 Security Implementation

### **1. Input Sanitization**
```typescript
import validator from 'validator';

function sanitizeQuery(userInput: string): string {
  // Remove potential XSS vectors
  let sanitized = validator.escape(userInput);
  
  // Limit length to prevent abuse
  sanitized = sanitized.slice(0, 1000);
  
  // Remove sensitive patterns
  sanitized = sanitized.replace(/api[_-]?key/gi, '[REDACTED]');
  
  return sanitized;
}
```

### **2. File Upload Validation**
```typescript
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files allowed'), false);
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}.pdf`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter
});
```

### **3. API Key Protection**
```typescript
// Never expose API key to frontend
app.post('/api/chat', async (req, res) => {
  // API key stays in backend environment
  const response = await genai.chat.completions.create({
    apiKey: process.env.GEMINI_API_KEY, // Secure
    ...req.body
  });
  res.json(response);
});
```

---

## 📈 Scalability Considerations

### **Horizontal Scaling Strategy**
```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    image: ncert-backend:latest
    deploy:
      replicas: 3  # Multiple instances
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
  
  loadbalancer:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

### **Database Migration Path**
```typescript
// When scaling beyond 10,000 documents, migrate to PostgreSQL
interface DatabaseAdapter {
  save(doc: DocumentMetadata): Promise<void>;
  search(filters: Filters): Promise<DocumentMetadata[]>;
  delete(id: string): Promise<boolean>;
}

class PostgreSQLAdapter implements DatabaseAdapter {
  async save(doc: DocumentMetadata) {
    await pool.query(
      `INSERT INTO documents (id, gemini_file_id, book_name, class_name, subject, chapter, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [doc.id, doc.geminiFileId, doc.bookName, doc.className, doc.subject, doc.chapter, doc.uploadedAt]
    );
  }

  async search(filters: Filters) {
    const conditions = [];
    const params = [];
    
    if (filters.className) {
      conditions.push(`class_name = $${params.length + 1}`);
      params.push(filters.className);
    }
    
    const query = `SELECT * FROM documents WHERE ${conditions.join(' AND ')}`;
    const result = await pool.query(query, params);
    return result.rows;
  }
}
```

---

## 🧪 Testing Strategy

### **Unit Tests**
```typescript
describe('RAGService', () => {
  it('should enhance query with filters', () => {
    const service = new RAGService();
    const enhanced = service.enhanceQuery('What is photosynthesis?', {
      className: 'Class 6',
      subject: 'Science'
    });

    expect(enhanced).toContain('Class 6');
    expect(enhanced).toContain('Science');
    expect(enhanced).toContain('NCERT curriculum');
  });

  it('should handle API errors gracefully', async () => {
    const service = new RAGService();
    mockGeminiAPI.mockRejectedValueOnce(new Error('API quota exceeded'));

    const result = await service.processQuery('test', {});
    
    expect(result.error).toBe('Service temporarily unavailable');
    expect(result.fallback).toBe(true);
  });
});
```

### **Integration Tests**
```typescript
describe('Upload API', () => {
  it('should process PDF and create vector embeddings', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', './test/sample.pdf')
      .field('bookName', 'Mathematics')
      .field('className', 'Class 5')
      .field('subject', 'Math')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.documentId).toBeDefined();
  });
});
```

---

## 🎯 Key Performance Indicators (KPIs)

### **Technical Metrics**
- **P95 Query Latency**: < 5 seconds
- **Upload Success Rate**: > 98%
- **System Uptime**: > 99.5%
- **Cache Hit Rate**: > 60%
- **API Error Rate**: < 2%

### **Business Metrics**
- **Daily Active Teachers**: Target 1000+
- **Queries per Teacher**: Target 5+/day
- **User Retention**: Target 80% (7-day)
- **Query Resolution Rate**: Target 90%
- **Teacher Satisfaction**: Target 4.5+/5

---

## 🔧 Monitoring & Observability

### **Logging Strategy**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all queries for analytics
logger.info('RAG Query', {
  question: sanitizedQuestion,
  filters,
  responseTime: elapsed,
  tokensUsed: response.usage.total_tokens,
  userId: req.user?.id
});
```

### **Health Check Endpoint**
```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: await checkGeminiAPI(),
      storage: await checkFileStorage(),
      vectorStore: await checkVectorStore()
    },
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      documentsIndexed: await getDocumentCount()
    }
  };

  const statusCode = Object.values(health.services).every(s => s === 'ok') ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 📚 API Reference

### **Core Endpoints**

#### **1. Upload Document**
```http
POST /api/upload
Content-Type: multipart/form-data

file: <PDF binary>
bookName: "NCERT Mathematics"
className: "Class 6"
subject: "Mathematics"
chapter: "Chapter 3: Playing with Numbers"
```

**Response:**
```json
{
  "success": true,
  "documentId": "files/abc123",
  "metadata": {
    "bookName": "NCERT Mathematics",
    "className": "Class 6",
    "subject": "Mathematics",
    "chapter": "Chapter 3: Playing with Numbers",
    "uploadedAt": "2026-01-22T10:30:00Z"
  }
}
```

#### **2. Query RAG System**
```http
POST /api/chat
Content-Type: application/json

{
  "question": "How do I teach prime factorization to Class 6 students?",
  "filters": {
    "className": "Class 6",
    "subject": "Mathematics"
  }
}
```

**Response:**
```json
{
  "answer": "📖 NCERT Reference: Class 6 Mathematics, Chapter 3, Pages 58-61\n\n🎯 Teaching Strategy: Use factor trees...",
  "citations": [
    {
      "chapter": "Chapter 3: Playing with Numbers",
      "page": "58-61",
      "bookName": "NCERT Mathematics"
    }
  ],
  "confidence": 0.92,
  "timestamp": "2026-01-22T10:35:00Z"
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 22, 2026  
**Maintainer**: NCERT RAG Explorer Team
