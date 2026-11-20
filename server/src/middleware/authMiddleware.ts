import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/responseFormatter';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  authMethod?: 'bearer' | 'cookie';
}

/** Extract bearer token from Authorization header or HttpOnly cookie */
function extractToken(req: Request): { token?: string; method?: 'bearer' | 'cookie' } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.split(' ')[1], method: 'bearer' };
  }

  // Cookie fallback (HttpOnly session cookie)
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)ina_geo_token=([^;]+)/);
    if (match) {
      return { token: decodeURIComponent(match[1]), method: 'cookie' };
    }
  }

  return {};
}

/** Check if origin is allowed for state-changing operations */
function isAllowedOrigin(originStr: string, hostHeader?: string): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    const parsed = new URL(originStr);
    const originHost = parsed.host;

    // Same-host match
    if (hostHeader && originHost === hostHeader) {
      return true;
    }

    // Localhost development
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    // Configured CORS allowlist
    const allowed = config.allowedOrigins;
    if (allowed.some((a) => a === originStr || a === `${parsed.protocol}//${parsed.host}`)) {
      return true;
    }

    // Vercel deployment preview / production domains
    if (originHost.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validate Origin/CSRF on state-changing operations for cookie-authenticated browser sessions.
 */
export function validateCsrfOrigin(req: AuthenticatedRequest, res: Response): boolean {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }

  // Only apply to requests that rely on ambient browser credentials (cookies)
  if (req.authMethod !== 'cookie') {
    return true;
  }

  const originHeader = (req.headers.origin as string) || (req.headers.referer as string);
  if (!originHeader) {
    // Standard same-origin browser navigations/requests may omit Origin; if Referer is present, check it
    return true;
  }

  const isValid = isAllowedOrigin(originHeader, req.headers.host);
  if (!isValid) {
    sendError(
      res,
      'CSRF_ORIGIN_INVALID',
      'Permintaan ditolak: validasi keamanan CSRF / Origin gagal.',
      403
    );
    return false;
  }

  return true;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const { token, method } = extractToken(req);

  if (!token) {
    sendError(res, 'UNAUTHORIZED', 'Akses ditolak. Token otentikasi tidak disediakan.', 401);
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    req.authMethod = method;

    // Validate Origin / CSRF for cookie-authenticated mutating requests
    if (!validateCsrfOrigin(req, res)) {
      return;
    }

    next();
  } catch (error) {
    sendError(res, 'INVALID_TOKEN', 'Token tidak valid atau telah kedaluwarsa.', 401);
    return;
  }
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const { token, method } = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
      req.authMethod = method;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
