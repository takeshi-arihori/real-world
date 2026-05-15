<?php

declare(strict_types=1);

namespace App\Presentation\Http\Responses;

use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class RealWorldErrorResponse
{
    /**
     * API ルートの例外を RealWorld 互換 JSON として扱うか判定する。
     */
    public static function shouldRenderFor(Request $request): bool
    {
        return $request->is('api/*');
    }

    /**
     * 例外を RealWorld 互換の `errors.body` レスポンスへ変換する。
     */
    public static function fromThrowable(Throwable $exception): JsonResponse
    {
        [$status, $messages] = self::resolve($exception);

        return new JsonResponse([
            'errors' => [
                'body' => $messages,
            ],
        ], $status);
    }

    /**
     * 例外ごとの HTTP status と公開可能な error message を解決する。
     *
     * @return array{0: int, 1: list<string>}
     */
    private static function resolve(Throwable $exception): array
    {
        if ($exception instanceof AuthenticationException) {
            return [Response::HTTP_UNAUTHORIZED, ['Unauthenticated.']];
        }

        if ($exception instanceof ValidationException) {
            return [Response::HTTP_UNPROCESSABLE_ENTITY, self::validationMessages($exception)];
        }

        if ($exception instanceof DomainException) {
            return [Response::HTTP_UNPROCESSABLE_ENTITY, [self::fallbackMessage($exception, 'Unprocessable entity.')]];
        }

        if ($exception instanceof AuthorizationException || $exception instanceof AccessDeniedHttpException) {
            return [Response::HTTP_FORBIDDEN, ['Forbidden.']];
        }

        if ($exception instanceof NotFoundHttpException) {
            return [Response::HTTP_NOT_FOUND, ['Resource not found.']];
        }

        if ($exception instanceof HttpExceptionInterface) {
            return [
                $exception->getStatusCode(),
                [self::httpStatusMessage($exception->getStatusCode())],
            ];
        }

        return [Response::HTTP_INTERNAL_SERVER_ERROR, ['Internal server error.']];
    }

    /**
     * FormRequest の field 別 validation message を `errors.body` 用に平坦化する。
     *
     * @return list<string>
     */
    private static function validationMessages(ValidationException $exception): array
    {
        $messages = [];
        /** @var array<string, list<string>> $errors */
        $errors = $exception->errors();

        foreach ($errors as $fieldMessages) {
            foreach ($fieldMessages as $message) {
                $messages[] = $message;
            }
        }

        return $messages === []
            ? ['The given data was invalid.']
            : $messages;
    }

    /**
     * 空の例外メッセージをクライアント向けの既定文言へ置き換える。
     */
    private static function fallbackMessage(Throwable $exception, string $fallback): string
    {
        $message = trim($exception->getMessage());

        return $message === '' ? $fallback : $message;
    }

    /**
     * HTTP 例外をクライアントへ返してよい汎用メッセージへ変換する。
     */
    private static function httpStatusMessage(int $status): string
    {
        return match ($status) {
            Response::HTTP_UNAUTHORIZED => 'Unauthenticated.',
            Response::HTTP_FORBIDDEN => 'Forbidden.',
            Response::HTTP_NOT_FOUND => 'Resource not found.',
            Response::HTTP_UNPROCESSABLE_ENTITY => 'Unprocessable entity.',
            Response::HTTP_INTERNAL_SERVER_ERROR => 'Internal server error.',
            default => Response::$statusTexts[$status] ?? 'Error.',
        };
    }
}
