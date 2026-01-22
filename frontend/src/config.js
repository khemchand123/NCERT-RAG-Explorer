// Environment-aware configuration
const config = {
    // Determine API URL based on environment
    API_URL: (() => {
        // If running in Docker (backend service name resolves)
        if (window.location.hostname === 'localhost' && window.location.port === '3002') {
            return 'http://localhost:3001/api';
        }
        // If running in development
        if (window.location.hostname === 'localhost' && window.location.port === '5173') {
            return 'http://localhost:3001/api';
        }
        // Production or Docker environment
        return `${window.location.protocol}//${window.location.hostname}:3001/api`;
    })()
};

export default config;