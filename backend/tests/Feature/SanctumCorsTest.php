<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('CORS', function (): void {
    it('許可オリジンへのリクエストにCORSヘッダーを返す', function (): void {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3005',
        ])->get('/sanctum/csrf-cookie');

        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3005');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    });

    it('不正オリジンへのアクセスを許可しない', function (): void {
        $response = $this->withHeaders([
            'Origin' => 'http://evil.example.com',
        ])->get('/sanctum/csrf-cookie');

        // CORSライブラリは許可オリジンの値をヘッダーに返すが、
        // ブラウザはリクエストのOriginと不一致のため接続をブロックする
        expect($response->headers->get('Access-Control-Allow-Origin'))
            ->not->toBe('http://evil.example.com');
    });

    it('許可オリジンからのプリフライトOPTIONSリクエストを処理する', function (): void {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3005',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/user');

        $response->assertNoContent();
        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3005');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    });
});

describe('Sanctum CSRFクッキー', function (): void {
    it('CSRFクッキーエンドポイントが204を返す', function (): void {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3005',
        ])->get('/sanctum/csrf-cookie');

        $response->assertNoContent();
    });
});

describe('API認証', function (): void {
    it('未認証リクエストに401を返す', function (): void {
        $this->getJson('/api/user')
            ->assertUnauthorized();
    });

    it('認証済みユーザーの情報を返す', function (): void {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    });
});
