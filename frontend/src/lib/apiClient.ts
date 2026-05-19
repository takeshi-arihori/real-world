import { ApiError, type ApiErrorKind } from './apiError';
import { getAuthToken } from './authToken';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface ApiClientConfig {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

interface ApiRequestOptions {
  auth?: boolean;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

interface ApiRequestOptionsWithMethod extends ApiRequestOptions {
  method?: string;
}

interface FetchResponseOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
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

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseUrl = config.baseUrl ?? DEFAULT_API_BASE_URL;

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

async function fetchResponse(
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

function createHeaders({
  auth,
  body,
  headers,
}: {
  auth: boolean;
  body: unknown;
  headers?: HeadersInit;
}): Headers {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();

  if (auth && token !== null && token !== '' && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Token ${token}`);
  }

  return requestHeaders;
}

function resolveUrl(path: string, baseUrl: string): string {
  if (baseUrl === '') {
    return path;
  }

  return new URL(path, normalizeBaseUrl(baseUrl)).toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

async function parseSuccessResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  if (response.status === 204 || !hasJsonContent(response)) {
    return null as TResponse;
  }

  return parseJson(response) as Promise<TResponse>;
}

async function createHttpError(response: Response): Promise<ApiError> {
  const bodyErrors = hasJsonContent(response)
    ? extractBodyErrors(await parseJson(response))
    : [];
  const kind = getErrorKind(response.status);
  const message =
    bodyErrors.at(0) ?? `API request failed with status ${response.status}`;

  return new ApiError(message, {
    bodyErrors,
    kind,
    status: response.status,
  });
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause: unknown) {
    throw new ApiError('Unexpected API response', {
      bodyErrors: [],
      cause,
      kind: 'unexpected',
    });
  }
}

function hasJsonContent(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false;
}

function getErrorKind(status: number): ApiErrorKind {
  if (status === 401) {
    return 'unauthorized';
  }

  if (status === 403) {
    return 'forbidden';
  }

  if (status === 404) {
    return 'not_found';
  }

  if (status === 422) {
    return 'validation';
  }

  return 'unexpected';
}

function extractBodyErrors(payload: unknown): string[] {
  if (!isRecord(payload) || !isRecord(payload.errors)) {
    return [];
  }

  const { body } = payload.errors;

  if (!Array.isArray(body)) {
    return [];
  }

  return body.filter((entry): entry is string => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
