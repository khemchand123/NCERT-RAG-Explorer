const API_URL = 'http://localhost:3000/api';

const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const metadataInput = document.getElementById('metadata-input');
const indexBtn = document.getElementById('index-btn');
const uploadStatus = document.getElementById('upload-status');

const searchInput = document.getElementById('search-input');
const filterInput = document.getElementById('filter-input');
const searchBtn = document.getElementById('search-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const answerBox = document.getElementById('answer-box');
const answerContent = document.getElementById('answer-content');
const citationsContainer = document.getElementById('citations');

// Handle file selection
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
    } else {
        fileNameDisplay.textContent = 'Choose a file...';
    }
});

// Handle indexing
indexBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    if (!file) {
        showStatus('Please select a file first.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = metadataInput.value.trim();
    if (metadata) {
        formData.append('metadata', metadata);
    }

    try {
        indexBtn.disabled = true;
        showStatus('Uploading and indexing document... This may take a minute.', 'info');

        const response = await fetch(`${API_URL}/index`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus('Document indexed successfully!', 'success');
        } else {
            showStatus(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        indexBtn.disabled = false;
    }
});

// Handle search
searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    const filter = filterInput.value.trim();
    if (!query) return;

    try {
        searchBtn.disabled = true;
        answerBox.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        const response = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filter })
        });

        const data = await response.json();

        if (response.ok) {
            displayAnswer(data);
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        searchBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
});

function showStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#94a3b8';
}

function displayAnswer(data) {
    answerBox.classList.remove('hidden');
    answerContent.textContent = data.text;

    citationsContainer.innerHTML = '';
    if (data.groundingMetadata?.groundingChunks) {
        data.groundingMetadata.groundingChunks.forEach((chunk, index) => {
            const tag = document.createElement('span');
            tag.className = 'citation-tag';
            tag.textContent = `Source ${index + 1}`;
            citationsContainer.appendChild(tag);
        });
    }
}
