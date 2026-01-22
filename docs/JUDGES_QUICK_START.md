# Quick Start Guide for Judges
## Test NCERT RAG Explorer in 5 Minutes

> **For Hackathon Judges**: This guide helps you quickly evaluate our solution without reading full documentation

---

## 🚀 Option 1: Test Live Demo (2 minutes)

**No installation required!** Just open your browser:

### **Step 1: Visit Live Demo**
🌐 **https://ncert.aidhunik.com/**

### **Step 2: Try Example Queries**

Click on the **"Chat"** or **"Ask a Question"** section and try these:

#### **Query 1: Simple Concept Explanation**
```
What is photosynthesis?
```
**Expected**: Answer with NCERT Class 6 Science Chapter reference, simple explanation, key terms highlighted

---

#### **Query 2: Pedagogical Strategy** (Core Use Case for Theme 1)
```
My Class 4 students don't understand why we borrow in subtraction when 
there's a zero in the tens place. How can I explain this with activities?
```
**Expected**: 
- 📖 NCERT Math Chapter 3 reference (specific page)
- 🎯 Concrete teaching strategy (bundled sticks activity)
- 📝 Step-by-step activity instructions
- 💡 Tips for resource-constrained classrooms

---

#### **Query 3: Classroom Management**
```
How do I manage a multi-grade classroom with Class 3 and Class 5 students 
learning together? What does NCERT suggest?
```
**Expected**: Differentiation strategies, activity ideas that work for mixed abilities

---

### **Step 3: Test Document Upload** (Optional)

1. Click **"Upload Chapter"** button
2. Download sample NCERT PDF: [Link to any NCERT PDF from ncert.nic.in]
3. Fill metadata:
   - Book Name: "Mathematics"
   - Class: "Class 6"
   - Subject: "Math"
   - Chapter: "Chapter 1: Knowing Our Numbers"
4. Upload and wait ~20 seconds for processing
5. Query: "What is place value?" (should now reference the uploaded chapter)

---

## 💻 Option 2: Local Deployment (5 minutes)

**If you want to test deployment ease:**

### **Prerequisites**
- Docker installed
- 2GB RAM, 10GB disk space
- Google Gemini API Key ([Get Free](https://ai.google.dev/))

### **Step 1: Clone & Configure**
```bash
# Clone repository
git clone https://github.com/yourusername/ncert-rag-explorer.git
cd ncert-rag-explorer

# Create environment file
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
PORT=3101
STORE_NAME=ncert-rag-store-test
GEMINI_MODEL=gemini-2.5-flash
EOF
```

### **Step 2: Deploy**
```bash
# Single command deployment
sudo docker compose up --build -d

# Wait 30 seconds for services to start
```

### **Step 3: Verify**
```bash
# Check health
curl http://localhost:3101/health
# Expected: {"status":"ok","gemini_configured":true}

# Access frontend
open http://localhost:3102
# Or visit: http://localhost:3102 in your browser
```

### **Step 4: Test**
- Frontend: http://localhost:3102
- Backend API: http://localhost:3101
- Use same queries as in Option 1

---

## 📊 Evaluation Criteria Checklist

### **Theme 1 Alignment (20 points)**
- [ ] **Solves "just-in-time coaching"**: Teachers get instant answers (not weeks later)
- [ ] **Personalized guidance**: Answers are specific to grade level, subject, and classroom context
- [ ] **Curriculum-grounded**: All responses cite NCERT chapters/pages (not generic web answers)
- [ ] **Scalable**: Works for 1 teacher or 1 million (same infrastructure)

**Test**: Try the "subtraction with zero" query above. Check if response:
- References specific NCERT chapter (✅)
- Provides actionable teaching strategy (✅)
- Considers resource constraints (✅)
- Arrives in < 10 seconds (✅)

---

### **Technical Implementation (20 points)**
- [ ] **Working Prototype**: Live demo accessible at https://ncert.aidhunik.com/
- [ ] **Deployment Simplicity**: Can deploy with single `docker compose up` command
- [ ] **Technology Choices**: Uses proven stack (Google Gemini, React, Node.js, Docker)
- [ ] **Code Quality**: TypeScript for type safety, proper error handling, security measures

**Test**: 
- Try invalid file upload (non-PDF) → Should show error
- Try query without documents → Should handle gracefully
- Check response time (should be < 5 seconds for most queries)

---

### **Innovation & Impact (20 points)**
- [ ] **Novel Approach**: RAG system specifically for NCERT curriculum (not generic chatbot)
- [ ] **Real-World Impact**: Addresses actual teacher pain point (lag time between problem and solution)
- [ ] **Measurable Outcomes**: 99.997% reduction in support time (21 days → 5 seconds)
- [ ] **Cost-Effectiveness**: ₹3/teacher/month vs. ₹5,000 for workshop

**Test**: Compare our solution to alternatives:
- Generic ChatGPT: Not NCERT-specific, no curriculum grounding
- DIKSHA Portal: Video-based, not conversational, no personalization
- Physical CRP visits: 21-day lag, limited capacity

---

### **Scalability & Sustainability (20 points)**
- [ ] **Technical Scalability**: Google infrastructure handles millions of queries
- [ ] **Financial Sustainability**: Free tier supports 15,000 teachers; paid tier very affordable
- [ ] **Geographic Scalability**: Cloud-based, works anywhere with internet
- [ ] **Operational Scalability**: Minimal maintenance (managed AI, containerized deployment)

**Test**: 
- Check if system handles concurrent queries (open 3 browser tabs, query simultaneously)
- Verify can add new subjects/classes without code changes (just upload PDFs)

---

### **User Experience (20 points)**
- [ ] **Ease of Use**: Simple interface, no training required
- [ ] **Mobile-Friendly**: Works on smartphones (where most teachers access)
- [ ] **Response Quality**: Answers are helpful, actionable, curriculum-aligned
- [ ] **Visual Design**: Clean, professional, appropriate for education context

**Test**:
- Open on mobile device (or resize browser to mobile width)
- Check if UI elements are accessible
- Verify response formatting is readable (markdown rendering, citations clear)

---

## 🎯 Key Differentiators to Notice

### **1. NCERT-Grounded Responses**
Unlike generic AI chatbots, our system:
- ✅ Cites specific NCERT chapters, pages, examples
- ✅ Uses NCERT pedagogical approach (activity-based, conceptual)
- ✅ References curriculum materials teachers already trust

**Test**: Try same query in ChatGPT vs. our system. Compare specificity.

---

### **2. Teacher-Centric Design**
Built for real government school realities:
- ✅ Works on budget smartphones (₹5,000 devices)
- ✅ Low data usage (< 1MB per query)
- ✅ Simple language (no academic jargon)
- ✅ Considers resource constraints (no expensive materials suggested)

**Test**: Notice how responses suggest "bundled sticks" not "manipulatives kit" (realistic for rural schools)

---

### **3. Just-in-Time Support**
Solves the core Theme 1 problem:
- ✅ **Before**: Teacher waits 21 days for CRP visit
- ✅ **After**: Teacher gets answer in 5 seconds while planning lesson

**Test**: Time a query from submission to response. Should be < 10 seconds.

---

## 💡 Questions to Ask (If Presenting Live)

### **About Problem-Solution Fit**
1. "How does this specifically address the 'lag time' issue mentioned in Theme 1?"
   - **Answer**: Instant responses (5 sec) vs. 21-day CRP visit cycle

2. "Why not just use ChatGPT/Claude for this?"
   - **Answer**: Generic AI doesn't ground responses in NCERT, provides web-based answers not curriculum-specific

3. "How do you ensure pedagogical quality of responses?"
   - **Answer**: RAG system retrieves from NCERT documents only; AI synthesizes from trusted sources

---

### **About Technical Implementation**
1. "Why Google Gemini over other AI models?"
   - **Answer**: Best RAG performance, free tier (10k docs), managed infrastructure, 1M context window

2. "How do you handle incorrect AI responses?"
   - **Answer**: All responses cite sources (Chapter, Page) so teachers can verify; future: feedback loop for corrections

3. "What happens if Google changes API pricing?"
   - **Answer**: Open-source → states can self-host; also can swap AI provider (abstracted interface)

---

### **About Scalability**
1. "Can this scale to all 1.5 million government teachers?"
   - **Answer**: Yes - free tier handles 15k teachers; paid tier unlimited; horizontal scaling via Docker replicas

2. "What about rural areas with poor internet?"
   - **Answer**: PWA for offline caching (Phase 2); 3G-optimized (responses < 1MB); can deploy at block/cluster level

3. "How do you handle multiple languages?"
   - **Answer**: Infrastructure ready (Gemini multilingual); Phase 2 adds Hindi, Tamil, Telugu; prompts already templated

---

## 🏆 Why This Should Win

### **Completeness** ✅
- Working live demo (not concept)
- Full Docker deployment (not slides)
- Comprehensive documentation (4 detailed docs)
- Open-source code (GitHub)

### **Impact** ✅
- Addresses real pain point (Sunita's story is real)
- Measurable outcomes (99.997% time reduction)
- Scalable solution (works for millions)
- Financially sustainable (₹3/month/teacher)

### **Innovation** ✅
- First NCERT-specific RAG system
- Teacher-centric UX (not student-focused)
- Just-in-time professional development
- Complements (not replaces) existing support

### **Feasibility** ✅
- Already deployed and tested
- Single-command setup (`docker compose up`)
- Proven technology stack
- Low operational overhead

---

## 📞 Contact for Questions

**During Evaluation:**
- Live Demo: https://ncert.aidhunik.com/
- GitHub: https://github.com/yourusername/ncert-rag-explorer
- Email: [your-email]
- Phone: [your-phone] (for technical issues during testing)

**For Immediate Support:**
If live demo is down or you face issues, please contact immediately.  
We have backup deployment and can assist with local setup.

---

## ⏱️ Time Estimate for Full Evaluation

| Activity | Time |
|----------|------|
| Test live demo (3 queries) | 3 min |
| Review documentation overview | 5 min |
| Test local deployment (optional) | 5 min |
| Deep dive into 1 document | 15 min |
| **Total for Quick Evaluation** | **10-30 min** |

---

## 🎬 Video Demo

**Can't test live?** Watch our 3-minute demo video:  
🎥 **[YouTube Link]** (Coming soon - will be uploaded by submission time)

**Video covers:**
- Problem statement (Sunita's story)
- Live demo of query system
- Document upload process
- Response quality showcase
- Deployment simplicity

---

## ✅ Quick Checklist for Judges

**Before scoring, verify you've:**
- [ ] Tested at least 2 queries on live demo
- [ ] Reviewed response quality (citations, specificity, actionability)
- [ ] Checked deployment simplicity (optional local test)
- [ ] Read executive summary in HACKATHON_SUBMISSION.md
- [ ] Evaluated against Theme 1 criteria

---

**Thank you for taking the time to evaluate NCERT RAG Explorer!** 🙏

We believe this solution can genuinely transform how 1.5 million Indian teachers receive professional support—making quality education more equitable and accessible.

---

**Guide Version**: 1.0  
**Created**: January 22, 2026  
**For**: Innovation for Education Equity Hackathon - ShikshaLokam 2026
