import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const activeRole = localStorage.getItem('activeRole');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (activeRole) {
    config.headers['X-Active-Role'] = activeRole;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('activeRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

