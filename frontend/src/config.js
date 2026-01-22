// Environment-aware configuration
const config = {
    // Determine API URL based on environment
    API_URL: (() => {
        // Check for environment variable (for build-time configuration)
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        
        // Development environments (localhost)
        if (window.location.hostname === 'localhost') {
            // Docker environment (frontend on 3102)
            if (window.location.port === '3102') {
                return 'http://localhost:3101/api';
            }
            // Vite dev server (frontend on 5173)
            if (window.location.port === '5173') {
                return 'http://localhost:3101/api';
            }
            // Any other localhost port
            return 'http://localhost:3101/api';
        }
        
        // Production environment - use your domain
        if (window.location.hostname === 'aidhunik.com' || window.location.hostname.includes('aidhunik.com')) {
            return 'https://api.aidhunik.com/ncert';
        }
        
        // Fallback for other domains (staging, etc.)
        return `${window.location.protocol}//${window.location.hostname}/api`;
    })()
};

export default config;