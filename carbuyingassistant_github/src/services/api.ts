import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = 'https://your-api-domain.com/api'; // Replace with your actual API URL

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = ''; // Get from secure storage: await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 API Response:', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error('❌ API Response Error:', error.response.status, error.response.data);
      
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - handle token refresh or logout
          console.log('🔒 Unauthorized - redirect to login');
          break;
        case 403:
          console.log('🚫 Forbidden');
          break;
        case 404:
          console.log('🔍 Not Found');
          break;
        case 500:
          console.log('🔥 Server Error');
          break;
        default:
          console.log('⚠️ API Error:', error.response.status);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ Network Error - No response received');
    } else {
      // Error in setting up the request
      console.error('❌ Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API Helper functions
export const dealershipApi = {
  getAll: () => api.get('/dealerships'),
  getById: (id: string) => api.get(`/dealerships/${id}`),
  getNearby: (latitude: number, longitude: number, radius: number = 50) =>
    api.get('/dealerships/nearby', { params: { latitude, longitude, radius } }),
  search: (query: string) => api.get('/dealerships/search', { params: { q: query } }),
};
