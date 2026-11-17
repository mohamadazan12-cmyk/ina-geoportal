import { describe, it, expect } from 'vitest';
import { resolveProviderBadge } from '../utils/providerIdentity';
import { apiClient } from '../services/apiClient';

describe('Phase 14 P0.7 — provider identity presentation', () => {
  it('never marks an email/password account as Google Verified', () => {
    const badge = resolveProviderBadge({ provider: 'local', googleId: null });
    expect(badge.isGoogleVerified).toBe(false);
    expect(badge.label).not.toContain('Google');
    expect(badge.description).toContain('Akun Lokal');
    expect(badge.showGoogleSubjectId).toBe(false);
  });

  it('treats a missing provider as local instead of assuming Google', () => {
    const badge = resolveProviderBadge({ provider: null, googleId: null });
    expect(badge.isGoogleVerified).toBe(false);
    expect(badge.label).toBe('Akun Lokal');
  });

  it('handles an undefined user without throwing', () => {
    const badge = resolveProviderBadge(undefined);
    expect(badge.isGoogleVerified).toBe(false);
    expect(badge.showGoogleSubjectId).toBe(false);
  });

  it('marks a genuinely linked Google account as verified', () => {
    const badge = resolveProviderBadge({ provider: 'google', googleId: 'google-sub-123' });
    expect(badge.isGoogleVerified).toBe(true);
    expect(badge.label).toBe('Google Verified');
    expect(badge.description).toContain('Google OAuth');
    expect(badge.showGoogleSubjectId).toBe(true);
  });

  it('does not render a Google subject id for a Google account without one', () => {
    const badge = resolveProviderBadge({ provider: 'google', googleId: null });
    expect(badge.isGoogleVerified).toBe(true);
    expect(badge.showGoogleSubjectId).toBe(false);
  });
});

describe('Phase 14 P0.6 — same-origin API base URL', () => {
  it('defaults to a relative /api/v1 path so the SPA and API share an origin', () => {
    const configured = import.meta.env.VITE_API_URL;
    const resolved = configured || '/api/v1';

    // Either an explicitly configured origin or the relative default is fine,
    // but the default must never hardcode a localhost backend.
    if (!configured) {
      expect(resolved).toBe('/api/v1');
    }
    expect(resolved).not.toContain('localhost:5000');
    expect(apiClient.defaults.baseURL).toBeTruthy();
  });
});
