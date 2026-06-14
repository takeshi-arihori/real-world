import { vi, type Mock } from 'vitest';

export type MockRouteResponse = Promise<Response> | Response | unknown;
export type MockRoutes = Record<string, MockRouteResponse | MockRouteResponse[]>;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type FetchMock = Mock<Fetcher>;

export interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}

/**
 * route integration tests向けにmethod+path優先、path fallbackのfetch mockを作る。
 */
export function createFetchMock(routes: MockRoutes): FetchMock {
  const fetcher: Fetcher = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const path = requestPath(input);
    const method = requestMethod(input, init);
    const response =
      readMockResponse(routes, `${method} ${path}`) ?? readMockResponse(routes, path);

    if (response instanceof Promise) {
      return response;
    }

    if (response instanceof Response) {
      return response;
    }

    if (response !== undefined) {
      return jsonResponse(response);
    }

    return jsonResponse(
      {
        errors: {
          body: [`Unhandled request: ${method} ${path}`],
        },
      },
      500,
    );
  };

  return vi.fn(fetcher);
}

export function getRequestLog(fetchMock: FetchMock): string[] {
  return fetchMock.mock.calls.map(([input, init]) => {
    const method = requestMethod(input, init);
    const path = requestPath(input);

    return `${method} ${path}`;
  });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

export function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>['resolve'] | undefined;
  let reject: Deferred<T>['reject'] | undefined;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  if (resolve === undefined || reject === undefined) {
    throw new Error('Deferred callbacks were not initialized.');
  }

  return {
    promise,
    reject,
    resolve,
  };
}

function readMockResponse(
  routes: MockRoutes,
  key: string,
): MockRouteResponse | undefined {
  const response = routes[key];

  if (Array.isArray(response)) {
    return response.shift();
  }

  return response;
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    const url = new URL(input, window.location.origin);

    return `${url.pathname}${url.search}`;
  }

  const url = input instanceof URL ? input : new URL(input.url, window.location.origin);

  return `${url.pathname}${url.search}`;
}

function requestMethod(input: RequestInfo | URL, init: RequestInit | undefined): string {
  if (init?.method !== undefined) {
    return init.method.toUpperCase();
  }

  if (input instanceof Request) {
    return input.method.toUpperCase();
  }

  return 'GET';
}
