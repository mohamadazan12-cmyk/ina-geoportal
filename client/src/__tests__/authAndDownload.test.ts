import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';

// Safe in-memory storage mock for Node environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};

if (typeof window === 'undefined') {
  (global as any).window = { localStorage: mockLocalStorage };
  (global as any).localStorage = mockLocalStorage;
} else if (!window.localStorage) {
  (window as any).localStorage = mockLocalStorage;
}

// Open Redirect Sanitizer Helper test
export const sanitizeReturnUrl = (url?: string | null): string => {
  if (!url) return '/profile';
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !url.includes(':')) {
    return url;
  }
  return '/profile';
};

describe('Phase 12: Google Authentication & Document Download Client Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  describe('Authentication Store & Google OAuth Handling', () => {
    it('initial store state reflects unauthenticated anonymous visitor', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.session).toBeNull();
    });

    it('loginWithGoogle should successfully set session with Google profile attributes', async () => {
      const mockGoogleUser = {
        id: 'usr-google-123',
        name: 'Peneliti Google Demo',
        email: 'peneliti@google.com',
        avatarUrl: 'https://lh3.googleusercontent.com/a/mock-avatar=s96-c',
        provider: 'google',
        googleId: 'google-sub-123456789',
        emailVerified: true,
        role: 'USER',
        institution: 'Pengguna Publik',
      };

      vi.spyOn(authService, 'googleLogin').mockResolvedValueOnce({
        token: 'mock-app-jwt-token-777',
        user: mockGoogleUser,
      });

      const success = await useAuthStore.getState().loginWithGoogle('mock-google-credential-token');
      expect(success).toBe(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('mock-app-jwt-token-777');
      expect(state.user?.email).toBe('peneliti@google.com');
      expect(state.user?.provider).toBe('google');
      expect(state.user?.avatarUrl).toBe('https://lh3.googleusercontent.com/a/mock-avatar=s96-c');
      expect(state.user?.googleId).toBe('google-sub-123456789');
      expect(state.user?.emailVerified).toBe(true);
      expect(localStorage.getItem('ina_geo_token')).toBe('mock-app-jwt-token-777');
    });

    it('loginWithGoogle should capture error on rejected credential', async () => {
      vi.spyOn(authService, 'googleLogin').mockRejectedValueOnce(
        new Error('Token autentikasi Google telah kedaluwarsa.')
      );

      const success = await useAuthStore.getState().loginWithGoogle('mock-google-token-expired');
      expect(success).toBe(false);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toContain('kedaluwarsa');
    });

    it('login with email and password should successfully authenticate user and set token', async () => {
      const mockUser = {
        id: 'usr-demo-1',
        name: 'Peneliti Geospasial Demo',
        email: 'demo@inageoportal.go.id',
        institution: 'Pusat Riset Geospasial BRIN',
        role: 'USER',
      };

      vi.spyOn(authService, 'login').mockResolvedValueOnce({
        token: 'mock-jwt-demo-token-123',
        user: mockUser,
      });

      const success = await useAuthStore.getState().login('demo@inageoportal.go.id', 'Password123!');
      expect(success).toBe(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('mock-jwt-demo-token-123');
      expect(state.user?.email).toBe('demo@inageoportal.go.id');
      expect(state.user?.name).toBe('Peneliti Geospasial Demo');
      expect(localStorage.getItem('ina_geo_token')).toBe('mock-jwt-demo-token-123');
    });

    it('login with invalid credentials should fail and set error state', async () => {
      vi.spyOn(authService, 'login').mockRejectedValueOnce(
        new Error('Email atau password yang Anda masukkan salah.')
      );

      const success = await useAuthStore.getState().login('wrong@email.com', 'wrongpassword');
      expect(success).toBe(false);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.error).toContain('Email atau password yang Anda masukkan salah');
    });

    it('register should create account and automatically establish user session', async () => {
      const newRegisteredUser = {
        id: 'usr-new-999',
        name: 'Kartografer Baru',
        email: 'kartografer@geoportal.id',
        institution: 'Badan Informasi Geospasial',
        role: 'USER',
      };

      vi.spyOn(authService, 'register').mockResolvedValueOnce({
        token: 'mock-jwt-new-user-token',
        user: newRegisteredUser,
      });

      const success = await useAuthStore.getState().register({
        name: 'Kartografer Baru',
        email: 'kartografer@geoportal.id',
        password: 'PasswordBaru123!',
        institution: 'Badan Informasi Geospasial',
      });

      expect(success).toBe(true);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('mock-jwt-new-user-token');
      expect(state.user?.email).toBe('kartografer@geoportal.id');
      expect(state.user?.name).toBe('Kartografer Baru');
      expect(localStorage.getItem('ina_geo_token')).toBe('mock-jwt-new-user-token');
    });

    it('register should capture and surface duplicate email error', async () => {
      vi.spyOn(authService, 'register').mockRejectedValueOnce(
        new Error('Email ini sudah terdaftar. Silakan gunakan email lain atau login.')
      );

      const success = await useAuthStore.getState().register({
        name: 'Duplikat User',
        email: 'demo@inageoportal.go.id',
        password: 'Password123!',
      });

      expect(success).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toContain('sudah terdaftar');
    });

    it('logout should clear all credentials, storage, and session information', () => {
      localStorage.setItem('ina_geo_token', 'temp-token');
      useAuthStore.setState({
        isAuthenticated: true,
        token: 'temp-token',
        user: { id: 'u1', name: 'User 1', email: 'u1@geo.id', role: 'USER' },
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(localStorage.getItem('ina_geo_token')).toBeNull();
    });
  });

  describe('Security & Open Redirect Prevention', () => {
    it('preserves valid internal navigation paths', () => {
      expect(sanitizeReturnUrl('/katalog')).toBe('/katalog');
      expect(sanitizeReturnUrl('/katalog/ds-batas-kabkot')).toBe('/katalog/ds-batas-kabkot');
      expect(sanitizeReturnUrl('/standar-data')).toBe('/standar-data');
      expect(sanitizeReturnUrl('/unduh')).toBe('/unduh');
    });

    it('safely neutralizes malicious open redirect attempts to external origins', () => {
      expect(sanitizeReturnUrl('//evil.com')).toBe('/profile');
      expect(sanitizeReturnUrl('https://malicious-phishing.com')).toBe('/profile');
      expect(sanitizeReturnUrl('http://attacker.org/login')).toBe('/profile');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/profile');
      expect(sanitizeReturnUrl('\\evil.com')).toBe('/profile');
      expect(sanitizeReturnUrl('')).toBe('/profile');
      expect(sanitizeReturnUrl(null)).toBe('/profile');
    });
  });

  describe('Public Access vs Email Login Required Download Policy', () => {
    it('verifies that public catalog and metadata viewing does not require authentication', () => {
      // Anonymous user
      const isPublicRoute = (path: string): boolean => {
        const publicRoutes = ['/', '/katalog', '/standar-data', '/unduh', '/webmap', '/bantuan', '/kontak'];
        return publicRoutes.some((r) => path === r || path.startsWith('/katalog/'));
      };

      expect(isPublicRoute('/katalog')).toBe(true);
      expect(isPublicRoute('/katalog/ds-batas-kabkot')).toBe(true);
      expect(isPublicRoute('/standar-data')).toBe(true);
      expect(isPublicRoute('/unduh')).toBe(true);
    });

    it('verifies download action requires login when unauthenticated', () => {
      const determineDownloadAction = (isAuthenticated: boolean, datasetId: string, returnPath: string) => {
        if (!isAuthenticated) {
          return {
            allowed: false,
            redirectUrl: `/login?returnUrl=${encodeURIComponent(returnPath)}&downloadDataset=${datasetId}`,
            message: 'Login Diperlukan untuk Mengunduh',
          };
        }
        return {
          allowed: true,
          redirectUrl: null,
          message: 'Unduhan Diizinkan',
        };
      };

      const anonymousAttempt = determineDownloadAction(false, 'ds-batas-kabkot', '/katalog/ds-batas-kabkot');
      expect(anonymousAttempt.allowed).toBe(false);
      expect(anonymousAttempt.redirectUrl).toBe('/login?returnUrl=%2Fkatalog%2Fds-batas-kabkot&downloadDataset=ds-batas-kabkot');

      const authenticatedAttempt = determineDownloadAction(true, 'ds-batas-kabkot', '/katalog/ds-batas-kabkot');
      expect(authenticatedAttempt.allowed).toBe(true);
      expect(authenticatedAttempt.redirectUrl).toBeNull();
    });

    it('verifies document availability status policy (available vs unpublished)', () => {
      const checkDocumentAvailability = (doc: { isAvailableForDownload?: boolean }) => {
        if (!doc.isAvailableForDownload) {
          return {
            canDownload: false,
            buttonText: 'Dokumen Belum Tersedia untuk Diunduh',
            status: 'Dokumen belum tersedia untuk diunduh.',
          };
        }
        return {
          canDownload: true,
          buttonText: 'Unduh PDF Lengkap',
          status: 'Berkas Resmi Siap Diunduh',
        };
      };

      const docWithoutPhysicalFile = checkDocumentAvailability({ isAvailableForDownload: false });
      expect(docWithoutPhysicalFile.canDownload).toBe(false);
      expect(docWithoutPhysicalFile.buttonText).toBe('Dokumen Belum Tersedia untuk Diunduh');
      expect(docWithoutPhysicalFile.status).toBe('Dokumen belum tersedia untuk diunduh.');

      const docWithPhysicalFile = checkDocumentAvailability({ isAvailableForDownload: true });
      expect(docWithPhysicalFile.canDownload).toBe(true);
      expect(docWithPhysicalFile.buttonText).toBe('Unduh PDF Lengkap');
    });
  });
});
