import type { Context } from 'hono';

import { CSRF_HEADER_NAME } from '../config.js';
import type { BrowserSession } from '../session/browser-session.js';

export function hasValidCsrf(context: Context, session: BrowserSession | null): boolean {
  if (session === null) {
    return false;
  }

  return context.req.header(CSRF_HEADER_NAME) === session.csrfToken;
}
