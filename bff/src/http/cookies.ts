import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';

import type { BffConfig } from '../config.js';

export function setSessionCookie(context: Context, config: BffConfig, sessionId: string): void {
  // browser には opaque id だけを渡し、JWT と CSRF state は server-side に閉じる。
  setCookie(context, config.sessionCookieName, sessionId, {
    httpOnly: true,
    maxAge: config.sessionTtlSeconds,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}

export function expireSessionCookie(context: Context, config: BffConfig): void {
  // server-side session 削除と合わせて、browser 側の opaque id も即時失効させる。
  setCookie(context, config.sessionCookieName, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  });
}
