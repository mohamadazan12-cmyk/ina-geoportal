import { apiClient } from './apiClient';
import { AuthResponse, User } from '../types/auth';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    agreeTerms?: boolean;
    institution?: string;
  }): Promise<AuthResponse> {
    const res: any = await apiClient.post('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res: any = await apiClient.post('/auth/login', data);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
  },

  async googleLogin(credential: string): Promise<AuthResponse> {
    const res: any = await apiClient.post('/auth/google', { credential });
    return res.data;
  },

  async getMe(): Promise<User> {
    const res: any = await apiClient.get('/auth/me');
    return res.data;
  },
};
