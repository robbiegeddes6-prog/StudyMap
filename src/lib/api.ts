// API configuration for development
export const API_BASE_URL = import.meta.env.PROD
  ? 'https://your-production-api.com'
  : 'http://localhost:3001'; // Mock server port

console.log('🔧 API Configuration:', {
  API_BASE_URL,
  environment: import.meta.env.MODE
});