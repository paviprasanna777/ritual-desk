import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/environment';
import type { AuthenticatedUser } from '../types/express';

interface JwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

function expirationSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) {
    throw new Error('JWT_EXPIRES_IN must use seconds, minutes, hours, or days (for example: 30d)');
  }
  const amount = Number(match[1]);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds < 1) {
    throw new Error('JWT_EXPIRES_IN must resolve to a positive number of seconds');
  }
  return seconds;
}

function signature(input: string): Buffer {
  return createHmac('sha256', env.JWT_SECRET).update(input).digest();
}

export function createToken(user: AuthenticatedUser): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    ...user,
    iat: issuedAt,
    exp: issuedAt + expirationSeconds(env.JWT_EXPIRES_IN),
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const content = `${header}.${encodedPayload}`;
  return `${content}.${signature(content).toString('base64url')}`;
}

export function verifyToken(token: string): AuthenticatedUser | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return undefined;

    const expectedSignature = signature(`${parts[0]}.${parts[1]}`);
    const suppliedSignature = Buffer.from(parts[2], 'base64url');
    if (
      suppliedSignature.length !== expectedSignature.length
      || !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return undefined;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as Partial<JwtPayload>;
    if (
      !Number.isSafeInteger(payload.id)
      || (payload.id ?? 0) < 1
      || typeof payload.username !== 'string'
      || !Number.isSafeInteger(payload.exp)
      || (payload.exp ?? 0) <= Math.floor(Date.now() / 1000)
    ) {
      return undefined;
    }
    return { id: payload.id!, username: payload.username };
  } catch {
    return undefined;
  }
}
