/**
 * Identity provider presentation helpers.
 *
 * Phase 14 / P0.7: email/password accounts are `local`. Historically the
 * database defaulted new records to `google`, which caused local accounts to
 * display a "Google Verified" badge they had not earned. The badge must be
 * derived from the stored provider only — never inferred from "has a password"
 * or "has a session".
 */

export type ProviderId = 'local' | 'google' | string;

export interface ProviderUserShape {
  provider?: ProviderId | null;
  googleId?: string | null;
}

export interface ProviderBadge {
  /** True only for accounts genuinely authenticated through Google. */
  isGoogleVerified: boolean;
  /** Short badge text for the profile header. */
  label: string;
  /** Full description used in the account-information list. */
  description: string;
  /** Whether the Google subject identifier row should be rendered. */
  showGoogleSubjectId: boolean;
}

export function resolveProviderBadge(user: ProviderUserShape | null | undefined): ProviderBadge {
  const provider = (user?.provider || 'local').toLowerCase();
  const isGoogle = provider === 'google';

  return {
    isGoogleVerified: isGoogle,
    label: isGoogle ? 'Google Verified' : 'Akun Lokal',
    description: isGoogle ? 'Google OAuth 2.0 (OpenID Connect)' : 'Akun Lokal / Terotentikasi',
    showGoogleSubjectId: isGoogle && Boolean(user?.googleId),
  };
}
