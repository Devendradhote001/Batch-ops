import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ROLES, type Role } from '@batchops/shared';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

export const ACCESS_COOKIE = 'bo_at';
export const REFRESH_COOKIE = 'bo_rt';
/** The refresh cookie is only ever sent to the auth routes. */
const REFRESH_COOKIE_PATH = '/api/auth';

const ACCESS_TTL_SECONDS = env.ACCESS_TOKEN_TTL_MIN * 60;
const REFRESH_TTL_SECONDS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

interface TokenSubject {
  id: string;
  role: Role;
  tokenVersion: number;
}

export interface AccessPayload {
  sub: string;
  role: Role;
  tv: number;
}

export interface RefreshPayload {
  sub: string;
  tv: number;
}

function signAccessToken(user: TokenSubject) {
  return jwt.sign({ role: user.role, tv: user.tokenVersion }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

function signRefreshToken(user: TokenSubject) {
  return jwt.sign({ tv: user.tokenVersion }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: REFRESH_TTL_SECONDS,
  });
}

function verify(token: string, secret: string, expiredCode: string): jwt.JwtPayload {
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === 'string' || !payload.sub || typeof payload.tv !== 'number') {
      throw new Error('Malformed token payload');
    }
    return payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Your session has expired', expiredCode);
    }
    throw ApiError.unauthorized('Invalid session token', 'INVALID_TOKEN');
  }
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = verify(token, env.JWT_ACCESS_SECRET, 'TOKEN_EXPIRED');
  if (!ROLES.includes(payload.role)) throw ApiError.unauthorized('Invalid session token', 'INVALID_TOKEN');
  return { sub: payload.sub!, role: payload.role, tv: payload.tv };
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = verify(token, env.JWT_REFRESH_SECRET, 'REFRESH_EXPIRED');
  return { sub: payload.sub!, tv: payload.tv };
}

function baseCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: env.isProduction, sameSite: 'lax' };
}

/** Issues a fresh access + refresh token pair (refresh tokens rotate on every use). */
export function setAuthCookies(res: Response, user: TokenSubject) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: REFRESH_COOKIE_PATH });
}
