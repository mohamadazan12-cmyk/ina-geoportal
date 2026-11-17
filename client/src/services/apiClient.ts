import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ina_geo_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<any>) => {
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'Terjadi gangguan jaringan atau server.';
    return Promise.reject(new Error(message));
  }
);
