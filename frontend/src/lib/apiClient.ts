import { createHttpError, parseSuccessResponse } from './apiResponse';
import {
  createHeaders,
  fetchResponse,
  resolveUrl,
  type ApiRequestOptions,
  type ApiRequestOptionsWithMethod,
} from './apiRequest';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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
 * feature API が raw fetch と token storage を直接扱わないための共通API clientを生成する。
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseUrl = config.baseUrl ?? DEFAULT_API_BASE_URL;

  /**
   * HTTP methodを含む低レベルrequestを実行し、成功レスポンスまたはtyped ApiErrorへ正規化する。
   */
  async function request<TResponse>(
    path: string,
    options: ApiRequestOptionsWithMethod = {},
  ): Promise<TResponse> {
    const fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
    const { auth = true, body, headers, method = 'GET', signal } = options;
    const response = await fetchResponse(fetcher, resolveUrl(path, baseUrl), {
      body,
      headers: createHeaders({ auth, body, headers }),
      method,
      signal,
    });

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
