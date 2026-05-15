<?php

declare(strict_types=1);

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Fixtures\RealWorldErrorResponseTestRequest;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function (): void {
    Route::middleware('api')->prefix('api')->group(function (): void {
        Route::get('/__test-forbidden', function (): never {
            throw new AuthorizationException('You cannot update this article.');
        });

        Route::post('/__test-validation', function (RealWorldErrorResponseTestRequest $request): JsonResponse {
            return response()->json(['ok' => true]);
        });

        Route::get('/__test-domain-exception', function (): never {
            throw new DomainException('cannot follow yourself');
        });

        Route::get('/__test-unexpected-exception', function (): never {
            throw new RuntimeException('secret-token=abc123 /var/www/html/.env SELECT * FROM users');
        });
    });
});

function assertRealWorldApiError(TestResponse $response, int $status, array $messages): void
{
    $response
        ->assertStatus($status)
        ->assertExactJson([
            'errors' => [
                'body' => $messages,
            ],
        ]);
}

describe('RealWorld API error response', function (): void {
    it('未認証リクエストに401とerrors.bodyを返す', function (): void {
        assertRealWorldApiError(
            $this->getJson('/api/user'),
            401,
            ['Unauthenticated.'],
        );
    });

    it('権限なしリクエストに403とerrors.bodyを返す', function (): void {
        assertRealWorldApiError(
            $this->getJson('/api/__test-forbidden'),
            403,
            ['Forbidden.'],
        );
    });

    it('存在しないAPI resourceに404とerrors.bodyを返す', function (): void {
        assertRealWorldApiError(
            $this->getJson('/api/__missing-resource'),
            404,
            ['Resource not found.'],
        );
    });

    it('Accept headerがないAPI例外もJSONのerrors.bodyで返す', function (): void {
        assertRealWorldApiError(
            $this->get('/api/__missing-resource'),
            404,
            ['Resource not found.'],
        );
    });

    it('FormRequestの複数field validation errorを422のerrors.bodyへ平坦化する', function (): void {
        assertRealWorldApiError(
            $this->postJson('/api/__test-validation', []),
            422,
            [
                'title is required',
                'body is required',
            ],
        );
    });

    it('DomainExceptionを業務例外として422のerrors.bodyへ変換する', function (): void {
        assertRealWorldApiError(
            $this->getJson('/api/__test-domain-exception'),
            422,
            ['cannot follow yourself'],
        );
    });

    it('想定外例外は500の汎用メッセージにして内部情報を返さない', function (): void {
        $response = $this->getJson('/api/__test-unexpected-exception');

        assertRealWorldApiError(
            $response,
            500,
            ['Internal server error.'],
        );

        $responseText = $response->getContent();

        expect($responseText)
            ->not->toContain('secret-token')
            ->not->toContain('/var/www/html/.env')
            ->not->toContain('SELECT * FROM users');
    });
});
