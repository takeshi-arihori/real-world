import { isApiError } from '../../../lib/apiError';

/**
 * form componentがunknown errorをユーザー表示用の文字列配列へ変換する。
 */
export function getFormErrors(error: unknown): string[] {
  if (isApiError(error)) {
    return error.bodyErrors.length > 0 ? error.bodyErrors : [error.message];
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ['Something went wrong. Please try again.'];
}
