import { create } from 'zustand';
import { User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthStore {
  user: User | null;
  token: string | null;
  session: { token: string; user: User } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; institution?: string }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: safeStorage.getItem('ina_geo_token'),
  session: null,
  isAuthenticated: !!safeStorage.getItem('ina_geo_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login({ email, password });
      safeStorage.setItem('ina_geo_token', res.token);
      set({
        token: res.token,
        user: res.user,
        session: { token: res.token, user: res.user },
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Gagal login',
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  },

  loginWithGoogle: async (credential: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.googleLogin(credential);
      safeStorage.setItem('ina_geo_token', res.token);
      set({
        token: res.token,
        user: res.user,
        session: { token: res.token, user: res.user },
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Gagal masuk menggunakan akun Ina-Geoportal',
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(data);
      safeStorage.setItem('ina_geo_token', res.token);
      set({
        token: res.token,
        user: res.user,
        session: { token: res.token, user: res.user },
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Gagal registrasi',
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    safeStorage.removeItem('ina_geo_token');
    set({
      user: null,
      token: null,
      session: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = safeStorage.getItem('ina_geo_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({
        user,
        session: { token, user },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      safeStorage.removeItem('ina_geo_token');
      set({
        user: null,
        token: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  refreshSession: async () => {
    await get().checkAuth();
  },
}));
