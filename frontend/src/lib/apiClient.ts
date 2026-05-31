import { ApiError } from './apiError';
import { createHttpError, parseSuccessResponse } from './apiResponse';
import {
  createHeaders,
  fetchResponse,
  resolveUrl,
  type ApiRequestOptions,
  type ApiRequestOptionsWithMethod,
} from './apiRequest';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const CSRF_PATH = '/api/session/csrf';
const MUTATING_METHODS = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);

export interface ApiClientConfig {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface ApiClient {
  delete: <TResponse>(
    path: string,
    options?: Omit<ApiRequestOptions, 'body'>,
  ) => Promise<TResponse>;
  get: <TResponse>(
    path: string,
    options?: Omit<ApiRequestOptions, 'body'>,
  ) => Promise<TResponse>;
  post: <TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'body'>,
  ) => Promise<TResponse>;
  put: <TResponse>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, 'body'>,
  ) => Promise<TResponse>;
  request: <TResponse>(
    path: string,
    options?: ApiRequestOptionsWithMethod,
  ) => Promise<TResponse>;
}

/**
 * feature API が raw fetch、cookie、CSRF proofを直接扱わないための共通API clientを生成する。
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseUrl = config.baseUrl ?? DEFAULT_API_BASE_URL;
  let csrfToken: string | null = null;

  async function getCsrfToken(signal?: AbortSignal): Promise<string> {
    if (csrfToken !== null) {
      return csrfToken;
    }

    csrfToken = await fetchCsrfToken(signal);

    return csrfToken;
  }

  async function refreshCsrfToken(signal?: AbortSignal): Promise<string> {
    csrfToken = await fetchCsrfToken(signal);

    return csrfToken;
  }

  async function fetchCsrfToken(signal?: AbortSignal): Promise<string> {
    const fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
    const response = await fetchResponse(fetcher, resolveUrl(CSRF_PATH, baseUrl), {
      credentials: 'same-origin',
      headers: createHeaders({
        body: undefined,
      }),
      method: 'GET',
      signal,
    });

    if (!response.ok) {
      throw await createHttpError(response);
    }

    const payload = await parseSuccessResponse<unknown>(response);

    if (!isRecord(payload) || typeof payload.csrfToken !== 'string') {
      throw new ApiError('Unexpected CSRF response', {
        bodyErrors: [],
        kind: 'unexpected',
      });
    }

    return payload.csrfToken;
  }

  /**
   * HTTP methodを含む低レベルrequestを実行し、成功レスポンスまたはtyped ApiErrorへ正規化する。
   */
  async function request<TResponse>(
    path: string,
    options: ApiRequestOptionsWithMethod = {},
  ): Promise<TResponse> {
    const fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
    const { body, headers, method = 'GET', signal } = options;
    const normalizedMethod = method.toUpperCase();
    const needsCsrf = MUTATING_METHODS.has(normalizedMethod);
    const url = resolveUrl(path, baseUrl);

    async function send(csrfProof: string | null): Promise<Response> {
      return fetchResponse(fetcher, url, {
        body,
        credentials: 'same-origin',
        headers: createHeaders({
          body,
          csrfToken: csrfProof,
          headers,
        }),
        method: normalizedMethod,
        signal,
      });
    }

    let response = await send(needsCsrf ? await getCsrfToken(signal) : null);

    if (needsCsrf && response.status === 419) {
      response = await send(await refreshCsrfToken(signal));
    }

    if (!response.ok) {
      throw await createHttpError(response);
    }

    return parseSuccessResponse<TResponse>(response);
  }

  return {
    delete: <TResponse>(
      path: string,
      options: Omit<ApiRequestOptions, 'body'> = {},
    ): Promise<TResponse> =>
      request<TResponse>(path, {
        ...options,
        method: 'DELETE',
      }),
    get: <TResponse>(
      path: string,
      options: Omit<ApiRequestOptions, 'body'> = {},
    ): Promise<TResponse> =>
      request<TResponse>(path, {
        ...options,
        method: 'GET',
      }),
    post: <TResponse>(
      path: string,
      body?: unknown,
      options: Omit<ApiRequestOptions, 'body'> = {},
    ): Promise<TResponse> =>
      request<TResponse>(path, {
        ...options,
        body,
        method: 'POST',
      }),
    put: <TResponse>(
      path: string,
      body?: unknown,
      options: Omit<ApiRequestOptions, 'body'> = {},
    ): Promise<TResponse> =>
      request<TResponse>(path, {
        ...options,
        body,
        method: 'PUT',
      }),
    request,
  };
}

export const apiClient = createApiClient();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
