# Deployment Success Checklist
## NCERT RAG Explorer - Hackathon Submission

> **Use this checklist to ensure your submission is complete and deployable**

---

## Pre-Submission Checklist

### **1. Code Quality ✅**
- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] Frontend builds successfully (`cd frontend && npm run build`)
- [ ] No console errors in development mode
- [ ] All dependencies listed in `package.json`
- [ ] `.gitignore` includes `node_modules/`, `.env`, `uploads/`, `data/`
- [ ] Code follows consistent formatting (Prettier/ESLint)

### **2. Environment Configuration ✅**
- [ ] `.env.example` file exists with all required variables
- [ ] `.env` file is in `.gitignore` (never commit secrets!)
- [ ] README documents all environment variables
- [ ] Instructions for obtaining Gemini API key included

**Required Environment Variables:**
```env
GEMINI_API_KEY=your_api_key_here
PORT=3101
STORE_NAME=ncert-rag-store-fixed
GEMINI_MODEL=gemini-2.5-flash
```

### **3. Docker Deployment ✅**
- [ ] `Dockerfile` exists and builds successfully
- [ ] `docker-compose.yml` configured correctly
- [ ] Multi-stage build optimized for production
- [ ] Health checks configured
- [ ] Volumes mounted for persistence (`./data`, `./uploads`)
- [ ] Ports exposed correctly (3101, 3102)
- [ ] Non-root user configured in Dockerfile
- [ ] Test deployment: `sudo docker compose up --build`

### **4. Documentation ✅**
- [ ] **README.md**: Project overview, setup instructions, features
- [ ] **docs/HACKATHON_SUBMISSION.md**: Complete hackathon writeup
- [ ] **docs/TECHNICAL_IMPLEMENTATION.md**: Architecture deep dive
- [ ] **docs/PITCH_DECK.md**: Presentation script
- [ ] **docs/DEPLOYMENT_CHECKLIST.md**: This file
- [ ] All docs include:
  - Clear headings and structure
  - Code examples where applicable
  - Live demo URL (https://ncert.aidhunik.com/)
  - Contact information

### **5. Live Deployment ✅**
- [ ] Application deployed to production server
- [ ] Domain configured (ncert.aidhunik.com)
- [ ] HTTPS/SSL certificate active
- [ ] Health endpoint responding: `/health`
- [ ] Frontend accessible and functional
- [ ] Backend API reachable from frontend
- [ ] Sample NCERT chapters uploaded
- [ ] Test query returns valid response

**Test Commands:**
```bash
# Health check
curl https://ncert.aidhunik.com/health

# Test query
curl -X POST https://ncert.aidhunik.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is photosynthesis?", "filters": {"className": "Class 6"}}'
```

### **6. Submission Materials ✅**
- [ ] **Video Demo**: 2-3 minute walkthrough uploaded to YouTube
- [ ] **GitHub Repository**: Public, with clean commit history
- [ ] **Live Demo Link**: Working and tested
- [ ] **Presentation Slides**: PDF exported from pitch deck
- [ ] **Team Information**: Names, roles, contact details
- [ ] **License**: MIT or Apache 2.0 (open source)

---

## Deployment Instructions

### **Option 1: Quick Local Test (5 minutes)**

```bash
# 1. Clone repository
git clone https://github.com/yourusername/ncert-rag-explorer.git
cd ncert-rag-explorer

# 2. Setup environment
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY

# 3. Deploy with Docker
sudo docker compose up --build -d

# 4. Verify deployment
curl http://localhost:3101/health

# 5. Access application
# Frontend: http://localhost:3102
# Backend: http://localhost:3101
```

### **Option 2: Production Deployment (15 minutes)**

```bash
# 1. SSH into your server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/yourusername/ncert-rag-explorer.git
cd ncert-rag-explorer

# 3. Setup production environment
cp .env.example .env.production
nano .env.production
# Add:
# GEMINI_API_KEY=your_key
# PORT=3101
# STORE_NAME=ncert-rag-store-production
# NODE_ENV=production

# 4. Deploy with production compose file
sudo docker compose -f docker-compose.prod.yml up -d

# 5. Configure reverse proxy (Traefik/Nginx)
# See your server's proxy configuration

# 6. Setup SSL certificate
# If using Traefik: automatic via Let's Encrypt
# If using Nginx: certbot --nginx -d ncert.yourdomain.com

# 7. Verify public access
curl https://ncert.yourdomain.com/health
```

---

## Testing Checklist

### **Functional Tests**

#### **1. Document Upload**
- [ ] Upload single NCERT chapter PDF (< 50MB)
- [ ] Verify metadata form requires all fields
- [ ] Check upload progress indicator works
- [ ] Confirm success message displays
- [ ] Verify document appears in dashboard
- [ ] Test uploading invalid file type (should fail gracefully)

#### **2. RAG Query System**
- [ ] Ask simple question: "What is photosynthesis?"
- [ ] Verify response in < 10 seconds
- [ ] Check response includes NCERT citation (Chapter, Page)
- [ ] Test with grade filter: "For Class 6 students..."
- [ ] Test with subject filter: "In Mathematics..."
- [ ] Try complex pedagogical query:  
  "How do I teach subtraction with borrowing to Class 4 students who struggle with zero in tens place?"
- [ ] Verify response includes:
  - 📖 NCERT Reference
  - 🎯 Teaching Strategy
  - 📝 Suggested Activity
  - 💡 Teacher Tip

#### **3. Dashboard Features**
- [ ] Filter chapters by class (dropdown)
- [ ] Filter chapters by subject (dropdown)
- [ ] Search chapters by name
- [ ] View chapter details modal
- [ ] Delete chapter (admin feature)
- [ ] View statistics (total chapters, recent uploads)

#### **4. Mobile Responsiveness**
- [ ] Test on mobile browser (Chrome Android/Safari iOS)
- [ ] Verify layout adapts to small screens
- [ ] Check touch targets are large enough
- [ ] Test file upload on mobile
- [ ] Verify keyboard doesn't obscure input fields

### **Performance Tests**

- [ ] Query response time < 5 seconds (P95)
- [ ] Upload processing < 30 seconds (for 10MB PDF)
- [ ] Dashboard loads in < 3 seconds (on 4G)
- [ ] Concurrent queries: 10 simultaneous users
- [ ] Memory usage stable under load (< 1GB)

### **Security Tests**

- [ ] API key not exposed in frontend code (check DevTools → Network)
- [ ] File upload rejects non-PDF files
- [ ] File upload rejects files > 50MB
- [ ] XSS prevention: Try `<script>alert('xss')</script>` in query
- [ ] SQL injection prevention: Try `'; DROP TABLE--` in metadata
- [ ] Rate limiting active (100 requests/15min on `/api/chat`)

---

## Common Issues & Solutions

### **Issue: "API Key Invalid" Error**
**Solution:**
```bash
# Verify API key is correct
cat .env | grep GEMINI_API_KEY

# Restart containers to reload environment
sudo docker compose restart
```

### **Issue: Upload Fails Silently**
**Solution:**
```bash
# Check backend logs
sudo docker compose logs backend | grep -i error

# Verify uploads directory exists and is writable
ls -la uploads/
sudo chmod 777 uploads/  # For testing only
```

### **Issue: Queries Return Empty Responses**
**Solution:**
```bash
# Verify documents are indexed in Gemini
curl -X GET http://localhost:3101/api/documents

# Check vector store name matches .env
echo $STORE_NAME  # Should match GEMINI_API_KEY store

# Re-upload a document to trigger indexing
```

### **Issue: Frontend Can't Reach Backend**
**Solution:**
```bash
# Check if backend is running
sudo docker compose ps

# Verify backend port is exposed
sudo netstat -tlnp | grep 3101

# Check frontend env points to correct backend URL
# In docker-compose.yml, verify:
# VITE_API_URL=http://backend:3101
```

### **Issue: Slow Query Responses (> 10 seconds)**
**Solution:**
- Check internet connection speed (Gemini API requires stable connection)
- Verify you're not hitting API rate limits
- Consider upgrading to paid Gemini tier for faster responses
- Enable response caching for frequent queries

---

## Final Submission Checklist

### **Before Hitting Submit:**

1. **Test Live Demo Publicly** ✅
   - Open https://ncert.aidhunik.com/ in incognito/private window
   - Upload a sample chapter
   - Ask 3 different types of questions
   - Verify all responses are curriculum-aligned

2. **Review All Documentation** ✅
   - Read through README.md as if you're a new user
   - Verify all links work (GitHub, live demo, video)
   - Check for typos and formatting issues
   - Ensure code examples are copy-pasteable

3. **Verify GitHub Repository** ✅
   - All code pushed to main branch
   - `.env` file NOT committed (security check)
   - README badges working (build status, license)
   - Releases tagged (v1.0.0)

4. **Create Submission Package** ✅
   - **Document 1**: HACKATHON_SUBMISSION.md (main writeup)
   - **Document 2**: TECHNICAL_IMPLEMENTATION.md (for technical judges)
   - **Document 3**: PITCH_DECK.md (for presentation)
   - **Video**: 2-3 minute demo on YouTube (unlisted or public)
   - **Slides**: PDF export of pitch deck
   - **GitHub**: Repository link
   - **Live Demo**: URL + test credentials (if needed)

5. **Team Confirmation** ✅
   - All team members listed with roles
   - Contact email responds (test it!)
   - Backup contact person identified

---

## Post-Submission Actions

### **After Submitting to Hackathon:**

1. **Monitor Live Demo** 📊
   - Check server logs daily for errors
   - Monitor uptime and response times
   - Keep API quota usage below limits

2. **Prepare for Presentation** 🎤
   - Practice 5-minute pitch (use PITCH_DECK.md)
   - Prepare backup demo video (in case live demo fails)
   - Test demo on presentation laptop
   - Have offline slides ready (PDF)

3. **Be Ready for Questions** ❓
   - Review TECHNICAL_IMPLEMENTATION.md
   - Understand every architectural decision
   - Know your scalability numbers
   - Prepare competitor comparison

4. **Gather Feedback** 💬
   - Share with teachers for testimonials
   - Document real-world usage (screenshots, quotes)
   - Track analytics (queries, popular topics)

---

## Success Criteria

**Your submission is ready if:**

✅ **It Works**: Anyone can deploy with `docker compose up`  
✅ **It's Fast**: Queries answered in < 5 seconds  
✅ **It's Documented**: README explains everything clearly  
✅ **It's Live**: Public demo accessible and functional  
✅ **It's Aligned**: Solves Theme 1 (on-the-go teacher support)  
✅ **It's Scalable**: Architecture supports 10 or 10,000 teachers  
✅ **It's Open**: Code is public, license is clear

---

## Final Pre-Flight Check

```bash
# Run this script before submission
./pre-flight-check.sh
```

**Script contents:**
```bash
#!/bin/bash
echo "🚀 NCERT RAG Explorer - Pre-Flight Check"
echo "=========================================="

echo "1. Checking Docker build..."
docker compose build || exit 1
echo "✅ Docker build successful"

echo "2. Checking environment configuration..."
[ -f .env ] || (echo "❌ .env file missing" && exit 1)
grep -q "GEMINI_API_KEY" .env || (echo "❌ GEMINI_API_KEY not set" && exit 1)
echo "✅ Environment configured"

echo "3. Starting containers..."
docker compose up -d
sleep 10

echo "4. Testing health endpoint..."
curl -f http://localhost:3101/health || (echo "❌ Health check failed" && exit 1)
echo "✅ Backend is healthy"

echo "5. Testing frontend..."
curl -f http://localhost:3102 || (echo "❌ Frontend not accessible" && exit 1)
echo "✅ Frontend is accessible"

echo "6. Testing RAG query..."
curl -X POST http://localhost:3101/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is photosynthesis?"}' \
  || (echo "❌ RAG query failed" && exit 1)
echo "✅ RAG system working"

echo ""
echo "=========================================="
echo "✅ ALL CHECKS PASSED!"
echo "🎉 Your submission is ready!"
echo "=========================================="
```

---

## Conclusion

If all items above are checked, your submission is **READY** for the Innovation for Education Equity Hackathon! 🏆

**Good luck!** 🎓

---

**Checklist Version**: 1.0  
**Last Updated**: January 22, 2026  
**Next Review**: Before submission deadline (Jan 22, 2026 11:59 PM)
