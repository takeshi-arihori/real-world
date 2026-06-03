import { randomBytes } from 'node:crypto';

export interface BrowserSession {
  csrfToken: string;
  expiresAt: number;
  id: string;
  // Public API JWT は browser に返さず、BrowserSession の server-side state として保持する。
  publicJwt: string | null;
}

export interface BrowserSessionStore {
  // login/register 前にも CSRF proof を発行できるよう、未認証 session を作成する。
  createPreSession: () => Promise<BrowserSession>;
  destroy: (sessionId: string | null) => Promise<void>;
  get: (sessionId: string | null) => Promise<BrowserSession | null>;
  startAuthenticatedSession: (
    previousSession: BrowserSession,
    publicJwt: string,
  ) => Promise<BrowserSession>;
}

export function randomOpaqueValue(): string {
  return randomBytes(32).toString('base64url');
}
