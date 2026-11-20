import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

// In-memory token storage for standalone/scripted API clients
let inMemoryApiToken: string | null = null;

export function setInMemoryApiToken(token: string | null): void {
  inMemoryApiToken = token;
}

export function getInMemoryApiToken(): string | null {
  return inMemoryApiToken;
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // For browser sessions, the HttpOnly session cookie (ina_geo_token) is sent
    // automatically via withCredentials: true.
    // If an in-memory token is explicitly provided (e.g. standalone API client), attach it:
    if (inMemoryApiToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryApiToken}`;
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
