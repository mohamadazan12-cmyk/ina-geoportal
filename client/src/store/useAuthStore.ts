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
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    agreeTerms?: boolean;
    institution?: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
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

// Safe cache key for UI hydration — stores non-sensitive profile only (NEVER the JWT)
const USER_CACHE_KEY = 'ina_geo_user_profile';

// Clean up legacy insecure token storage from previous application versions
safeStorage.removeItem('ina_geo_token');

const getInitialCachedUser = (): User | null => {
  try {
    const raw = safeStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getInitialCachedUser();

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: initialUser,
  token: null, // Ephemeral in-memory token (browser sessions rely on HttpOnly cookie)
  session: initialUser ? { token: '', user: initialUser } : null,
  isAuthenticated: !!initialUser,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login({ email, password });
      // Security hardening: store safe profile in localStorage for instant hydration,
      // but NEVER store the JWT token in frontend storage.
      safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      safeStorage.removeItem('ina_geo_token'); // Ensure legacy token is purged
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
      safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      safeStorage.removeItem('ina_geo_token');
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
      safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      safeStorage.removeItem('ina_geo_token');
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
    safeStorage.removeItem(USER_CACHE_KEY);
    safeStorage.removeItem('ina_geo_token');
    authService.logout();
    set({
      user: null,
      token: null,
      session: null,
      isAuthenticated: false,
      error: null,
    });
  },

  updateUser: (updatedUser: User) => {
    safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedUser));
    set((state) => ({
      user: updatedUser,
      session: state.token ? { token: state.token, user: updatedUser } : { token: '', user: updatedUser },
    }));
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Calls /auth/me with HttpOnly cookie automatically
      const user = await authService.getMe();
      safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      set({
        user,
        session: { token: '', user },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      safeStorage.removeItem(USER_CACHE_KEY);
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
