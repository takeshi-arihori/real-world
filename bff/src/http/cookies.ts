import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';

import type { BffConfig } from '../config.js';

export function setSessionCookie(context: Context, config: BffConfig, sessionId: string): void {
  setCookie(context, config.sessionCookieName, sessionId, {
    httpOnly: true,
    maxAge: config.sessionTtlSeconds,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}

export function expireSessionCookie(context: Context, config: BffConfig): void {
  setCookie(context, config.sessionCookieName, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}
