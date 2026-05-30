<?php

namespace Tests;

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use PHPUnit\Framework\Assert;

abstract class TestCase extends BaseTestCase
{
    /**
     * テスト用の JWT signing secret を config 経由で注入する。
     */
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'jwt.signing_secret' => 'testing-realworld-jwt-secret',
            'jwt.ttl_minutes' => 60,
        ]);
    }

    /**
     * RealWorld API 互換の JWT を発行する。
     */
    protected function issueRealWorldTokenFor(User $user, ?int $issuedAt = null, ?int $expiresAt = null): string
    {
        $issuedAt ??= time();
        $expiresAt ??= $issuedAt + 3600;

        return $this->encodeJwt([
            'sub' => (string) $user->getKey(),
            'iat' => $issuedAt,
            'exp' => $expiresAt,
        ]);
    }

    /**
     * RealWorld API 互換の `Token` auth scheme をテストリクエストへ設定する。
     */
    protected function withRealWorldToken(string $token): static
    {
        return $this->withHeaders(['Authorization' => 'Token '.$token]);
    }

    /**
     * JWT payload を検査用に decode する。
     *
     * @return array{sub: string, iat: int, exp: int}
     */
    protected function decodeRealWorldJwtPayload(string $token): array
    {
        $parts = explode('.', $token);

        Assert::assertCount(3, $parts, 'JWT must have header, payload, and signature segments.');

        /** @var array{sub: string, iat: int, exp: int} $payload */
        $payload = json_decode(
            $this->base64UrlDecode($parts[1]),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        return $payload;
    }

    /**
     * 指定 User 向けの RealWorld JWT であることを検証する。
     *
     * @return array{sub: string, iat: int, exp: int}
     */
    protected function assertRealWorldJwtForUser(string $token, User $user): array
    {
        $payload = $this->decodeRealWorldJwtPayload($token);

        Assert::assertSame((string) $user->getKey(), $payload['sub']);
        Assert::assertArrayHasKey('iat', $payload);
        Assert::assertArrayHasKey('exp', $payload);
        Assert::assertSame(3600, $payload['exp'] - $payload['iat']);

        return $payload;
    }

    /**
     * 署名だけを壊した JWT を返す。
     */
    protected function tamperJwtSignature(string $token): string
    {
        $parts = explode('.', $token);

        Assert::assertCount(3, $parts);

        $parts[2] = $this->base64UrlEncode('invalid-signature');

        return implode('.', $parts);
    }

    /**
     * テスト用 JWT を HS256 で encode する。
     *
     * @param  array{sub: string, iat: int, exp: int}  $payload
     */
    private function encodeJwt(array $payload): string
    {
        $header = $this->base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256',
        ], JSON_THROW_ON_ERROR));
        $claims = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $header.'.'.$claims, (string) config('jwt.signing_secret'), true);

        return $header.'.'.$claims.'.'.$this->base64UrlEncode($signature);
    }

    /**
     * JWT の base64url segment を encode する。
     */
    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /**
     * JWT の base64url segment を decode する。
     */
    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;

        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($value, '-_', '+/'), true) ?: '';
    }
}
