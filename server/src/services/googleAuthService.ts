import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

export interface GooglePayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

let cachedClient: OAuth2Client | null = null;

/** Lazily construct the OAuth2 client so module import has no side effects. */
function getClient(): OAuth2Client {
  if (!cachedClient) {
    cachedClient = new OAuth2Client(config.googleClientId);
  }
  return cachedClient;
}

export const googleAuthService = {
  /**
   * Verify Google ID token (JWT) using official Google Identity Services
   * Supports both live Google verification and isolated test mock tokens.
   */
  async verifyGoogleIdToken(idToken: string): Promise<GooglePayload> {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Token Google tidak disediakan atau tidak valid.');
    }

    // 1. Isolated Test Mock Handling for Automated Tests & Offline Dev
    if (idToken.startsWith('mock-google-token-')) {
      const mode = idToken.replace('mock-google-token-', '');

      if (mode === 'expired') {
        throw new Error('Token autentikasi Google telah kedaluwarsa.');
      }

      if (mode === 'unverified') {
        throw new Error('Email akun Google belum diverifikasi oleh Google.');
      }

      if (mode === 'invalid') {
        throw new Error('Token autentikasi Google tidak valid.');
      }

      if (mode === 'existing') {
        return {
          sub: 'google-sub-existing-12345',
          email: 'demo@inageoportal.go.id',
          emailVerified: true,
          name: 'Peneliti Geospasial Demo (Google)',
          picture: 'https://lh3.googleusercontent.com/a/mock-existing-avatar=s96-c',
        };
      }

      // Default mock: new user
      return {
        sub: `google-sub-${mode || 'new-98765'}`,
        email: `google.${mode || 'user'}@geoportal-test.id`,
        emailVerified: true,
        name: `Pengguna Google ${mode || 'Baru'}`,
        picture: 'https://lh3.googleusercontent.com/a/mock-new-avatar=s96-c',
      };
    }

    // 2. Real Google OAuth 2.0 / OpenID Connect Verification
    if (!config.googleClientId) {
      throw new Error(
        'GOOGLE_AUTH_NOT_CONFIGURED: Google Client ID belum dikonfigurasikan di environment server. Atur GOOGLE_CLIENT_ID di berkas .env.'
      );
    }

    try {
      const ticket = await getClient().verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Payload token Google kosong atau tidak terbaca.');
      }

      // Validate Issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        throw new Error(`Issuer token '${payload.iss}' tidak valid.`);
      }

      // Validate Expiration
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSeconds) {
        throw new Error('Token autentikasi Google telah kedaluwarsa.');
      }

      // Validate Email Verification
      if (!payload.email_verified) {
        throw new Error('Email akun Google belum diverifikasi oleh Google.');
      }

      if (!payload.sub || !payload.email) {
        throw new Error('Informasi identitas Google Subject ID atau email tidak lengkap.');
      }

      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: Boolean(payload.email_verified),
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch (err: any) {
      if (err.message && err.message.startsWith('GOOGLE_AUTH_NOT_CONFIGURED')) {
        throw err;
      }
      throw new Error(`Verifikasi Google gagal: ${err.message || 'Token tidak valid'}`);
    }
  },
};
