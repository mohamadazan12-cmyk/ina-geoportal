import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { googleAuthService } from '../services/googleAuthService';

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  institution: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Credential token Google wajib disertakan'),
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Data registrasi tidak valid', 422, parseResult.error.errors);
      return;
    }

    const { name, email, password, institution } = parseResult.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      sendError(res, 'EMAIL_EXISTS', 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.', 409);
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        institution: institution || 'Umum',
        // Email/password registration — explicitly local, never "google".
        provider: 'local',
        emailVerified: false,
        role: 'USER',
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          institution: user.institution,
          role: user.role,
        },
      },
      'Registrasi berhasil',
      undefined,
      201
    );
  } catch (error: any) {
    sendError(res, 'REGISTER_FAILED', error.message || 'Gagal melakukan pendaftaran akun', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Format email atau password salah', 422, parseResult.error.errors);
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      sendError(res, 'INVALID_CREDENTIALS', 'Email atau password yang Anda masukkan salah.', 401);
      return;
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      sendError(res, 'INVALID_CREDENTIALS', 'Email atau password yang Anda masukkan salah.', 401);
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        institution: user.institution,
        role: user.role,
      },
    }, 'Login berhasil');
  } catch (error: any) {
    sendError(res, 'LOGIN_FAILED', error.message || 'Gagal melakukan login', 500);
  }
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'VALIDATION_ERROR', 'Permintaan autentikasi Google tidak valid', 422, parseResult.error.errors);
      return;
    }

    const { credential } = parseResult.data;

    let googlePayload;
    try {
      googlePayload = await googleAuthService.verifyGoogleIdToken(credential);
    } catch (err: any) {
      sendError(res, 'GOOGLE_AUTH_FAILED', err.message || 'Verifikasi token Google gagal', 401);
      return;
    }

    const { sub, email, name, picture, emailVerified } = googlePayload;

    // 1. Search existing user by googleId (Primary Provider Identifier)
    let user = await prisma.user.findUnique({
      where: { googleId: sub },
    });

    let statusCode = 200;

    if (user) {
      // Existing Google user: update profile picture and name if refreshed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatarUrl: picture || user.avatarUrl,
          emailVerified: true,
        },
      });
    } else {
      // 2. Search existing user by email for account linking
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        // Link Google identity to existing verified email account
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: sub,
            avatarUrl: picture || existingByEmail.avatarUrl,
            provider: 'google',
            emailVerified: true,
          },
        });
      } else {
        // 3. Auto-register new user via Google Identity
        user = await prisma.user.create({
          data: {
            googleId: sub,
            email,
            name: name || email.split('@')[0],
            avatarUrl: picture || null,
            provider: 'google',
            emailVerified,
            role: 'USER',
            institution: 'Pengguna Publik',
          },
        });
        statusCode = 201;
      }
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          institution: user.institution,
          role: user.role,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          emailVerified: user.emailVerified,
        },
      },
      statusCode === 201 ? 'Akun baru berhasil didaftarkan via Google' : 'Login Google berhasil',
      undefined,
      statusCode
    );
  } catch (error: any) {
    sendError(res, 'GOOGLE_LOGIN_ERROR', error.message || 'Terjadi kesalahan pada login Google', 500);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Belum terotentikasi', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        role: true,
        avatarUrl: true,
        provider: true,
        googleId: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, user, 'Data profil berhasil diambil');
  } catch (error: any) {
    sendError(res, 'USER_FETCH_FAILED', error.message || 'Gagal memuat profil', 500);
  }
}
