import axios from 'axios';

/**
 * API Service
 * Configured Axios instance with base URL and auth token interceptor.
 * All API calls go through this instance for consistent auth handling.
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to every request if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by clearing auth state
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * API Functions
 * Clean wrappers for backend endpoints
 */

// Analyze code with AI
export const analyzeCode = (code, language, mode = 'explain') =>
  api.post('/analyze', { code, language, mode });

// Get user's analysis history
export const getHistory = () =>
  api.get('/history');

// Get a shared analysis by ID
export const getShared = (shareId) =>
  api.get(`/share/${shareId}`);

// Analyze a GitHub repository
export const analyzeGithub = (repoUrl) =>
  api.post('/github-analyze', { repoUrl });

export default api;
