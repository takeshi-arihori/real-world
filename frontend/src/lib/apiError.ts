export type ApiErrorKind =
  | 'csrf'
  | 'forbidden'
  | 'network'
  | 'not_found'
  | 'unauthorized'
  | 'unexpected'
  | 'validation';

interface ApiErrorDetails {
  bodyErrors?: string[];
  cause?: unknown;
  kind: ApiErrorKind;
  status?: number;
}

/**
 * API clientが返す失敗をHTTP statusや原因別に扱えるtyped errorとして表す。
 */
export class ApiError extends Error {
  readonly bodyErrors: string[];
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(message: string, details: ApiErrorDetails) {
    super(message, { cause: details.cause });
    this.name = 'ApiError';
    this.bodyErrors = details.bodyErrors ?? [];
    this.kind = details.kind;
    this.status = details.status;
  }
}

/**
 * unknown errorをApiErrorとして扱えるか判定する。
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
