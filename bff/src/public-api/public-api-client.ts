import type { Context } from 'hono';

import { CSRF_HEADER_NAME, type BffConfig } from '../config.js';

const BLOCKED_PUBLIC_IDENTITY_PATHS = new Set([
  '/api/user',
  '/api/users',
  '/api/users/login',
]);
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'authorization',
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  CSRF_HEADER_NAME,
]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'set-cookie',
  'transfer-encoding',
]);

export interface PublicApiForwardOptions {
  publicJwt: string | null;
  request: Request;
  targetPath: string;
}

export async function forwardRequestToPublicApi(
  config: BffConfig,
  options: PublicApiForwardOptions,
): Promise<Response> {
  const targetUrl = new URL(options.targetPath, config.publicApiBaseUrl);
  const init: RequestInit = {
    headers: createForwardHeaders(options.request.headers, options.publicJwt),
    method: options.request.method,
    redirect: 'manual',
  };

  if (options.request.method !== 'GET' && options.request.method !== 'HEAD') {
    const body = Buffer.from(await options.request.arrayBuffer());

    if (body.length > 0) {
      init.body = body;
    }
  }

  return fetch(targetUrl, init);
}

export async function upstreamResponseToBrowserResponse(
  upstreamResponse: Response,
  context?: Context,
): Promise<Response> {
  const headers = new Headers();

  upstreamResponse.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });

  if (context !== undefined) {
    const outgoingSetCookie = context.res.headers.get('set-cookie');

    if (outgoingSetCookie !== null) {
      headers.set('Set-Cookie', outgoingSetCookie);
    }
  }

  return new Response(await upstreamResponse.arrayBuffer(), {
    headers,
    status: upstreamResponse.status,
  });
}

export function extractPublicJwt(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }

  const user = body.user;

  if (!isRecord(user) || typeof user.token !== 'string' || user.token === '') {
    return null;
  }

  return user.token;
}

export function stripUserToken(body: unknown): unknown {
  if (!isRecord(body) || !isRecord(body.user)) {
    return body;
  }

  const userWithoutToken = { ...body.user };

  delete userWithoutToken.token;

  return {
    ...body,
    user: userWithoutToken,
  };
}

export function isBlockedPublicIdentityPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '');

  return BLOCKED_PUBLIC_IDENTITY_PATHS.has(normalizedPathname);
}

function createForwardHeaders(incomingHeaders: Headers, publicJwt: string | null): Headers {
  const headers = new Headers();

  incomingHeaders.forEach((value, name) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  });

  if (publicJwt !== null) {
    headers.set('Authorization', `Token ${publicJwt}`);
  }

  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
