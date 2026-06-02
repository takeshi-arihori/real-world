import {
  type BrowserSession,
  type BrowserSessionStore,
  randomOpaqueValue,
} from './browser-session.js';

export function createMemorySessionStore(ttlSeconds: number): BrowserSessionStore {
  return new MemorySessionStore(ttlSeconds);
}

class MemorySessionStore implements BrowserSessionStore {
  private readonly sessions = new Map<string, BrowserSession>();

  private readonly ttlMilliseconds: number;

  public constructor(ttlSeconds: number) {
    this.ttlMilliseconds = ttlSeconds * 1000;
  }

  public async createPreSession(): Promise<BrowserSession> {
    return this.persist({
      csrfToken: randomOpaqueValue(),
      expiresAt: 0,
      id: randomOpaqueValue(),
      publicJwt: null,
    });
  }

  public async destroy(sessionId: string | null): Promise<void> {
    if (sessionId !== null) {
      this.sessions.delete(sessionId);
    }
  }

  public async get(sessionId: string | null): Promise<BrowserSession | null> {
    if (sessionId === null) {
      return null;
    }

    const session = this.sessions.get(sessionId) ?? null;

    if (session === null) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  public async startAuthenticatedSession(
    previousSession: BrowserSession,
    publicJwt: string,
  ): Promise<BrowserSession> {
    await this.destroy(previousSession.id);

    return this.persist({
      csrfToken: previousSession.csrfToken,
      expiresAt: 0,
      id: randomOpaqueValue(),
      publicJwt,
    });
  }

  private persist(session: BrowserSession): BrowserSession {
    const persisted = {
      ...session,
      expiresAt: Date.now() + this.ttlMilliseconds,
    };

    this.sessions.set(persisted.id, persisted);

    return persisted;
  }
}
