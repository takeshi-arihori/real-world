export type ApiErrorKind =
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

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
