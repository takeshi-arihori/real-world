import { ApiError } from './apiError';

export interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export interface ApiRequestOptionsWithMethod extends ApiRequestOptions {
  method?: string;
}

interface FetchResponseOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * fetch例外をnetwork ApiErrorに変換し、JSON bodyは送信直前にserializeする。
 */
export async function fetchResponse(
  fetcher: typeof fetch,
  url: string,
  options: FetchResponseOptions,
): Promise<Response> {
  const { body, ...requestOptions } = options;
  const init: RequestInit = { ...requestOptions };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  try {
    return await fetcher(url, init);
  } catch (cause: unknown) {
    throw new ApiError('Network request failed', {
      bodyErrors: [],
      cause,
      kind: 'network',
    });
  }
}

/**
 * JSON APIとして必要な共通ヘッダーとBFF向けCSRF proof headerを組み立てる。
 */
export function createHeaders({
  body,
  csrfToken,
  headers,
}: {
  body: unknown;
  csrfToken?: string | null;
  headers?: HeadersInit;
}): Headers {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (
    csrfToken !== undefined &&
    csrfToken !== null &&
    csrfToken !== '' &&
    !requestHeaders.has('X-CSRF-TOKEN')
  ) {
    requestHeaders.set('X-CSRF-TOKEN', csrfToken);
  }

  return requestHeaders;
}

/**
 * 環境ごとのbase URL設定とAPI pathを安全に結合する。
 */
export function resolveUrl(path: string, baseUrl: string): string {
  if (baseUrl === '') {
    return path;
  }

  return new URL(path, normalizeBaseUrl(baseUrl)).toString();
}

/**
 * URL constructorでpath結合するときにpath segmentが欠落しないbase URLへ整える。
 */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}
