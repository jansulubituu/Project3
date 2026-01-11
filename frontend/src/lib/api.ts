import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or sessionStorage
    if (typeof window !== 'undefined') {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const token = rememberMe 
        ? localStorage.getItem('token')
        : sessionStorage.getItem('token') || localStorage.getItem('token'); // Fallback for backward compatibility
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token from both storages and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;


