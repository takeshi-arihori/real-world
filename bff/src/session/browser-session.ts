import { randomBytes } from 'node:crypto';

export interface BrowserSession {
  csrfToken: string;
  expiresAt: number;
  id: string;
  publicJwt: string | null;
}

export interface BrowserSessionStore {
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
