import fs from 'fs';
import path from 'path';

// We will use fetch to test the running server
// Ensure the server is running before executing this script

const API_URL = 'http://localhost:3000/api';

async function testIndex() {
    console.log('Testing Index API...');
    const filePath = path.join(__dirname, '../sample.txt');
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', blob, 'sample.txt');

    try {
        const response = await fetch(`${API_URL}/index`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('Index Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Index Error:', error);
    }
}

async function testSearch() {
    console.log('Testing Search API...');
    try {
        const response = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'Is storage free in Gemini File Search?' })
        });
        const data = await response.json();
        console.log('Search Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Search Error:', error);
    }
}

async function run() {
    // Note: This script assumes the server is already running.
    // Since we can't easily start the server and run this in the same process without complexity,
    // we will just define the functions.
    // In a real scenario, I'd start the server in background.

    // For this environment, I will try to run the server in background and then run this script.
    await testIndex();
    // Wait a bit for indexing to potentially propagate (though the API waits for it)
    await new Promise(r => setTimeout(r, 2000));
    await testSearch();
}

run();
