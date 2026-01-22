import config from './config.js';

const API_URL = config.API_URL;

// Global state
let currentView = 'dashboard';
let documentsData = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

// Upload elements
const dropZone = document.getElementById('drop-zone');
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const bookSelect = document.getElementById('book-select');
const classSelect = document.getElementById('class-select');
const chapterInput = document.getElementById('chapter-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const uploadStatus = document.getElementById('upload-status');

// Search elements
const globalSearch = document.getElementById('global-search');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');
const charCount = document.getElementById('char-count');

// Chapters elements
const chaptersGrid = document.getElementById('chapters-grid');
const chaptersLoading = document.getElementById('chapters-loading');
const noChapters = document.getElementById('no-chapters');
const filterBook = document.getElementById('filter-book');
const filterClass = document.getElementById('filter-class');
const refreshChapters = document.getElementById('refresh-chapters');

// Dashboard elements
const totalDocsHeader = document.getElementById('total-docs');
const dashboardTotalDocs = document.getElementById('dashboard-total-docs');
const recentUploads = document.getElementById('recent-uploads');
const recentUploadsGrid = document.getElementById('recent-uploads-grid');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Debug: Check if all elements are found
    console.log('Elements check:', {
        dropZone: !!dropZone,
        fileUpload: !!fileUpload,
        filePreview: !!filePreview,
        fileName: !!fileName,
        bookSelect: !!bookSelect,
        classSelect: !!classSelect,
        chapterInput: !!chapterInput,
        uploadBtn: !!uploadBtn
    });
    
    initializeApp();
    setupEventListeners();
    loadDocuments();
});

function initializeApp() {
    // Set initial view
    switchView('dashboard');
    
    // Setup sidebar toggle for mobile
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    // File upload
    setupFileUpload();
    
    // Search
    setupSearch();
    
    // Chapters
    setupChapters();
    
    // Form validation
    setupFormValidation();
}

function switchView(viewName) {
    currentView = viewName;
    
    // Update navigation
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Update views
    views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });
    
    // Close mobile sidebar
    sidebar.classList.remove('open');
    
    // Load data for specific views
    if (viewName === 'chapters') {
        loadDocuments();
    } else if (viewName === 'dashboard') {
        loadDashboardData();
    }
}

// File Upload Functions
function setupFileUpload() {
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // Click to browse
    dropZone.addEventListener('click', () => {
        fileUpload.click();
    });
    
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Remove file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFileSelection();
    });
    
    // Upload button
    uploadBtn.addEventListener('click', handleUpload);
}

function handleFileSelect(file) {
    console.log('File selected:', file);
    
    if (file.type !== 'application/pdf') {
        showStatus('Please select a PDF file.', 'error');
        return;
    }
    
    if (fileName) {
        fileName.textContent = file.name;
    }
    
    const dropZoneContent = document.querySelector('.drop-zone-content');
    if (dropZoneContent) {
        dropZoneContent.style.display = 'none';
    }
    
    if (filePreview) {
        filePreview.style.display = 'flex';
    }
    
    console.log('File selection complete, validating form...');
    validateForm();
}

function clearFileSelection() {
    fileUpload.value = '';
    fileName.textContent = '';
    document.querySelector('.drop-zone-content').style.display = 'block';
    filePreview.style.display = 'none';
    validateForm();
}

function setupFormValidation() {
    [bookSelect, classSelect, chapterInput].forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

function validateForm() {
    const hasFile = fileUpload && fileUpload.files && fileUpload.files.length > 0;
    const hasBook = bookSelect && bookSelect.value && bookSelect.value.trim() !== '';
    const hasClass = classSelect && classSelect.value && classSelect.value.trim() !== '';
    const hasChapter = chapterInput && chapterInput.value && chapterInput.value.trim() !== '';
    
    console.log('Form validation:', { hasFile, hasBook, hasClass, hasChapter });
    
    if (uploadBtn) {
        uploadBtn.disabled = !(hasFile && hasBook && hasClass && hasChapter);
        console.log('Upload button disabled:', uploadBtn.disabled);
    }
}

async function handleUpload() {
    console.log('Upload button clicked');
    
    const file = fileUpload.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('Uploading file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Create metadata
    const metadata = {
        book: bookSelect.value,
        class: classSelect.value,
        chapter: chapterInput.value,
        uploadDate: new Date().toISOString()
    };
    
    console.log('Metadata:', metadata);
    formData.append('metadata', JSON.stringify(metadata));
    
    try {
        uploadBtn.disabled = true;
        showUploadProgress(true);
        showStatus('Uploading and indexing chapter... This may take a minute.', 'info');
        
        console.log('Making API call to:', `${API_URL}/index`);
        
        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            updateProgress(progress);
        }, 500);
        
        const response = await fetch(`${API_URL}/index`, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        updateProgress(100);
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            showStatus('Chapter indexed successfully!', 'success');
            clearForm();
            loadDocuments(); // Refresh documents list
            
            // Show success animation
            setTimeout(() => {
                showUploadProgress(false);
                showStatus('', '');
            }, 2000);
        } else {
            showStatus(`Error: ${data.error}`, 'error');
            showUploadProgress(false);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`Error: ${error.message}`, 'error');
        showUploadProgress(false);
    } finally {
        uploadBtn.disabled = false;
    }
}

function showUploadProgress(show) {
    uploadProgress.style.display = show ? 'block' : 'none';
    if (!show) {
        updateProgress(0);
    }
}

function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = percent === 100 ? 'Processing complete!' : 'Uploading and indexing...';
}

function clearForm() {
    clearFileSelection();
    bookSelect.value = '';
    classSelect.value = '';
    chapterInput.value = '';
    validateForm();
}

// Search Functions
function setupSearch() {
    sendBtn.addEventListener('click', handleChatSend);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    });
    
    chatInput.addEventListener('input', (e) => {
        const length = e.target.value.length;
        charCount.textContent = length;
        sendBtn.disabled = length === 0;
    });
    
    globalSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = globalSearch.value.trim();
            if (query) {
                chatInput.value = query;
                switchView('search');
                handleChatSend();
            }
        }
    });
}

async function handleChatSend() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    chatInput.value = '';
    charCount.textContent = '0';
    sendBtn.disabled = true;
    
    // Show typing indicator
    showTypingIndicator(true);
    
    try {
        const response = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Add bot response to chat
            addMessageToChat(data.text, 'bot', data.groundingMetadata?.groundingChunks);
        } else {
            addMessageToChat(`Sorry, I encountered an error: ${data.error}`, 'bot');
        }
    } catch (error) {
        console.error('Chat error:', error);
        addMessageToChat('Sorry, I\'m having trouble connecting. Please try again.', 'bot');
    } finally {
        showTypingIndicator(false);
    }
}

function addMessageToChat(message, sender, citations = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = `${sender}-avatar`;
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const messageText = document.createElement('p');
    messageText.textContent = message;
    content.appendChild(messageText);
    
    // Add citations only if they exist and have content
    if (citations && citations.length > 0) {
        const citationsDiv = document.createElement('div');
        citationsDiv.className = 'citations-inline';
        citations.forEach((citation, index) => {
            // Only add citation if it has meaningful content
            if (citation && (citation.title || citation.uri || citation.snippet)) {
                const chip = document.createElement('span');
                chip.className = 'citation-chip';
                chip.textContent = `📚 Source ${index + 1}`;
                citationsDiv.appendChild(chip);
            }
        });
        
        // Only append citations div if it has children
        if (citationsDiv.children.length > 0) {
            content.appendChild(citationsDiv);
        }
    }
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    content.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator(show) {
    if (show) {
        typingIndicator.classList.remove('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        typingIndicator.classList.add('hidden');
    }
}

function sendQuickMessage(message) {
    chatInput.value = message;
    handleChatSend();
}

// Chapters Functions
function setupChapters() {
    refreshChapters.addEventListener('click', loadDocuments);
    
    filterBook.addEventListener('change', filterChapters);
    filterClass.addEventListener('change', filterChapters);
}

async function loadDocuments() {
    console.log('Loading documents...');
    
    try {
        if (chaptersLoading) {
            chaptersLoading.style.display = 'block';
        }
        if (noChapters) {
            noChapters.style.display = 'none';
        }
        if (chaptersGrid) {
            chaptersGrid.innerHTML = '';
        }
        
        console.log('Making API call to:', `${API_URL}/documents`);
        const response = await fetch(`${API_URL}/documents`);
        console.log('Documents response status:', response.status);
        
        const data = await response.json();
        console.log('Documents data:', data);
        
        if (response.ok) {
            documentsData = data.documents || [];
            console.log('Loaded documents:', documentsData.length);
            updateDocumentStats();
            displayChapters(documentsData);
        } else {
            console.error('Error loading documents:', data.error);
            showNoChapters();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showNoChapters();
    } finally {
        if (chaptersLoading) {
            chaptersLoading.style.display = 'none';
        }
    }
}

function updateDocumentStats() {
    const total = documentsData.length;
    totalDocsHeader.textContent = total;
    dashboardTotalDocs.textContent = total;
    
    // Count recent uploads (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recent = documentsData.filter(doc => {
        const createTime = new Date(doc.createTime);
        return createTime > weekAgo;
    }).length;
    
    recentUploads.textContent = recent;
}

function displayChapters(chapters) {
    if (chapters.length === 0) {
        showNoChapters();
        return;
    }
    
    chaptersGrid.innerHTML = '';
    
    chapters.forEach(chapter => {
        const card = createChapterCard(chapter);
        chaptersGrid.appendChild(card);
    });
    
    noChapters.style.display = 'none';
}

function createChapterCard(chapter) {
    const metadata = parseMetadata(chapter.metadata);
    const createDate = new Date(chapter.createTime).toLocaleDateString();
    
    const card = document.createElement('div');
    card.className = 'chapter-card';
    
    card.innerHTML = `
        <div class="chapter-header">
            <div class="chapter-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="chapter-title">${metadata.chapter || chapter.displayName}</div>
            <div class="chapter-menu">
                <button class="menu-btn" onclick="toggleChapterMenu('${chapter.name}')">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="chapter-menu-dropdown" id="menu-${chapter.name}" style="display: none;">
                    <button class="menu-item" onclick="chatWithChapter('${metadata.chapter || chapter.displayName}')">
                        <i class="fas fa-comments"></i> Chat
                    </button>
                    <button class="menu-item" onclick="viewChapterDetails('${chapter.name}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button class="menu-item delete-item" onclick="deleteChapter('${chapter.name}', '${metadata.chapter || chapter.displayName}')">
                        <i class="fas fa-trash-alt"></i> Delete Chapter
                    </button>
                </div>
            </div>
        </div>
        
        <div class="chapter-meta">
            ${metadata.book ? `<span class="meta-badge">${capitalizeFirst(metadata.book)}</span>` : ''}
            ${metadata.class ? `<span class="meta-badge">Class ${metadata.class}</span>` : ''}
        </div>
        
        <div class="chapter-info">
            <div>Uploaded: ${createDate}</div>
            <div>Size: ${formatFileSize(chapter.sizeBytes)}</div>
            <div>Status: ${chapter.state || 'Active'}</div>
        </div>
        
        <div class="chapter-actions">
            <button class="action-btn primary" onclick="chatWithChapter('${metadata.chapter || chapter.displayName}')">
                <i class="fas fa-comments"></i> Start Chat
            </button>
            <button class="action-btn secondary" onclick="viewChapterDetails('${chapter.name}')">
                <i class="fas fa-info-circle"></i> View Details
            </button>
        </div>
    `;
    
    return card;
}

function parseMetadata(metadata) {
    const parsed = {};
    if (metadata && Array.isArray(metadata)) {
        metadata.forEach(item => {
            if (item.key && item.stringValue) {
                parsed[item.key] = item.stringValue;
            }
        });
    }
    return parsed;
}

function filterChapters() {
    const bookFilter = filterBook.value;
    const classFilter = filterClass.value;
    
    let filtered = documentsData;
    
    if (bookFilter) {
        filtered = filtered.filter(doc => {
            const metadata = parseMetadata(doc.metadata);
            return metadata.book === bookFilter;
        });
    }
    
    if (classFilter) {
        filtered = filtered.filter(doc => {
            const metadata = parseMetadata(doc.metadata);
            return metadata.class === classFilter;
        });
    }
    
    displayChapters(filtered);
}

function showNoChapters() {
    chaptersGrid.innerHTML = '';
    noChapters.style.display = 'block';
}

// Dashboard Functions
function loadDashboardData() {
    updateDocumentStats();
    loadRecentUploads();
}

function loadRecentUploads() {
    if (!documentsData.length) {
        recentUploadsGrid.innerHTML = '<p class="text-muted">No recent uploads</p>';
        return;
    }
    
    // Get last 3 uploads
    const recent = documentsData
        .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        .slice(0, 3);
    
    recentUploadsGrid.innerHTML = '';
    
    recent.forEach(chapter => {
        const card = createChapterCard(chapter);
        recentUploadsGrid.appendChild(card);
    });
}

// Utility Functions
function chatWithChapter(chapterName) {
    chatInput.value = `Tell me about ${chapterName}`;
    switchView('search');
    handleChatSend();
}

function viewChapterDetails(chapterName) {
    // Find the chapter data
    const chapter = documentsData.find(doc => doc.name === chapterName);
    if (!chapter) {
        alert('Chapter not found');
        return;
    }
    
    showChapterModal(chapter);
}

function showChapterModal(chapter) {
    const metadata = parseMetadata(chapter.metadata);
    
    // Update modal icon based on file type
    const modalIcon = document.querySelector('.detail-icon i');
    if (modalIcon) {
        modalIcon.className = getFileTypeIcon(chapter.mimeType);
    }
    
    // Populate modal content
    document.getElementById('modal-title').textContent = 'Chapter Details';
    document.getElementById('detail-chapter-name').textContent = metadata.chapter || chapter.displayName;
    document.getElementById('detail-file-name').textContent = chapter.displayName;
    document.getElementById('detail-book').textContent = metadata.book ? capitalizeFirst(metadata.book) : '-';
    document.getElementById('detail-class').textContent = metadata.class ? `Class ${metadata.class}` : '-';
    document.getElementById('detail-size').textContent = formatFileSize(chapter.sizeBytes);
    document.getElementById('detail-upload-date').textContent = new Date(chapter.createTime).toLocaleString();
    document.getElementById('detail-mime-type').textContent = getReadableFileType(chapter.mimeType);
    document.getElementById('detail-status').textContent = chapter.state || 'Active';
    document.getElementById('detail-document-id').textContent = chapter.name;
    
    // Estimate pages based on file size (rough estimation)
    const estimatedPages = estimatePages(chapter.sizeBytes, chapter.mimeType);
    document.getElementById('detail-pages').textContent = estimatedPages;
    
    // Add indexing status with color coding
    const indexingStatusElement = document.getElementById('detail-indexing-status');
    if (chapter.state === 'ACTIVE') {
        indexingStatusElement.textContent = '✅ Indexed & Ready';
        indexingStatusElement.style.color = '#10b981';
    } else {
        indexingStatusElement.textContent = '⏳ Processing...';
        indexingStatusElement.style.color = '#f59e0b';
    }
    
    // Store current chapter for modal actions
    window.currentModalChapter = chapter;
    
    // Show modal
    const modal = document.getElementById('chapter-modal');
    modal.classList.remove('hidden');
    
    // Add event listeners for modal
    setupModalEventListeners();
}

function estimatePages(sizeBytes, mimeType) {
    if (!sizeBytes) return '-';
    
    // Rough estimation based on file type and size
    if (mimeType === 'application/pdf') {
        // Average PDF page is about 50-100KB
        const estimatedPages = Math.ceil(sizeBytes / 75000);
        return `~${estimatedPages} pages`;
    } else if (mimeType === 'text/plain') {
        // Average text page is about 2-4KB
        const estimatedPages = Math.ceil(sizeBytes / 3000);
        return `~${estimatedPages} pages`;
    } else if (mimeType && mimeType.includes('text')) {
        // Other text formats
        const estimatedPages = Math.ceil(sizeBytes / 4000);
        return `~${estimatedPages} pages`;
    } else {
        return 'Unknown';
    }
}

function getFileTypeIcon(mimeType) {
    if (!mimeType) return 'fas fa-file';
    
    if (mimeType === 'application/pdf') return 'fas fa-file-pdf';
    if (mimeType.includes('text')) return 'fas fa-file-alt';
    if (mimeType.includes('image')) return 'fas fa-file-image';
    if (mimeType.includes('video')) return 'fas fa-file-video';
    if (mimeType.includes('audio')) return 'fas fa-file-audio';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
    
    return 'fas fa-file';
}

function getReadableFileType(mimeType) {
    if (!mimeType) return 'Unknown';
    
    const typeMap = {
        'application/pdf': 'PDF Document',
        'text/plain': 'Text File',
        'text/html': 'HTML Document',
        'text/css': 'CSS File',
        'text/javascript': 'JavaScript File',
        'application/json': 'JSON File',
        'application/xml': 'XML File',
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'image/svg+xml': 'SVG Image',
        'video/mp4': 'MP4 Video',
        'audio/mp3': 'MP3 Audio',
        'application/msword': 'Word Document',
        'application/vnd.ms-excel': 'Excel Spreadsheet',
        'application/vnd.ms-powerpoint': 'PowerPoint Presentation'
    };
    
    return typeMap[mimeType] || mimeType;
}

function setupModalEventListeners() {
    const modal = document.getElementById('chapter-modal');
    const closeBtn = document.getElementById('modal-close');
    
    // Close modal when clicking close button
    closeBtn.onclick = closeChapterModal;
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeChapterModal();
        }
    };
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeChapterModal();
        }
    });
}

function closeChapterModal() {
    const modal = document.getElementById('chapter-modal');
    modal.classList.add('hidden');
    window.currentModalChapter = null;
}

function chatWithChapterFromModal() {
    if (window.currentModalChapter) {
        const metadata = parseMetadata(window.currentModalChapter.metadata);
        const chapterName = metadata.chapter || window.currentModalChapter.displayName;
        closeChapterModal();
        chatInput.value = `Tell me about ${chapterName}`;
        switchView('search');
        handleChatSend();
    }
}

function deleteChapterFromModal() {
    if (window.currentModalChapter) {
        const metadata = parseMetadata(window.currentModalChapter.metadata);
        const chapterName = metadata.chapter || window.currentModalChapter.displayName;
        closeChapterModal();
        deleteChapter(window.currentModalChapter.name, chapterName);
    }
}

function toggleChapterMenu(chapterId) {
    // Close all other menus first
    document.querySelectorAll('.chapter-menu-dropdown').forEach(menu => {
        if (menu.id !== `menu-${chapterId}`) {
            menu.style.display = 'none';
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${chapterId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chapter-menu')) {
        document.querySelectorAll('.chapter-menu-dropdown').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

async function deleteChapter(documentId, chapterName) {
    if (!confirm(`Are you sure you want to delete "${chapterName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        console.log('Deleting chapter:', documentId);
        
        const response = await fetch(`${API_URL}/documents/${encodeURIComponent(documentId)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        console.log('Delete response:', data);
        
        if (response.ok) {
            // Show success message
            showStatus('Chapter deleted successfully!', 'success');
            
            // Refresh the documents list
            loadDocuments();
            
            // Clear status after 3 seconds
            setTimeout(() => {
                showStatus('', '');
            }, 3000);
        } else {
            alert(`Error deleting chapter: ${data.error}`);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Error deleting chapter: ${error.message}`);
    }
}

function showStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.style.color = type === 'error' ? '#ef4444' : 
                              type === 'success' ? '#10b981' : '#94a3b8';
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Global functions for HTML onclick handlers
window.switchView = switchView;
window.sendQuickMessage = sendQuickMessage;
window.chatWithChapter = chatWithChapter;
window.viewChapterDetails = viewChapterDetails;
window.deleteChapter = deleteChapter;
window.closeChapterModal = closeChapterModal;
window.chatWithChapterFromModal = chatWithChapterFromModal;
window.deleteChapterFromModal = deleteChapterFromModal;
window.toggleChapterMenu = toggleChapterMenu;