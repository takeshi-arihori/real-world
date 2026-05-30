<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Carbon;
use JsonException;
use RuntimeException;

final readonly class JwtTokenCodec
{
    private const ALGORITHM = 'HS256';

    public function __construct(private ConfigRepository $config) {}

    /**
     * User ID を subject にした Public API JWT を発行する。
     */
    public function issueForUserId(int $userId): string
    {
        $issuedAt = Carbon::now()->getTimestamp();
        $expiresAt = $issuedAt + $this->ttlSeconds();

        return $this->encode([
            'sub' => (string) $userId,
            'iat' => $issuedAt,
            'exp' => $expiresAt,
        ]);
    }

    /**
     * Public API JWT を検証し、subject の User ID を返す。
     *
     * @throws AuthenticationException
     */
    public function userIdFromToken(string $token): int
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3 || in_array('', $segments, true)) {
            throw new AuthenticationException;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $segments;

        $header = $this->decodeJsonSegment($encodedHeader);
        $payload = $this->decodeJsonSegment($encodedPayload);

        if (($header['alg'] ?? null) !== self::ALGORITHM) {
            throw new AuthenticationException;
        }

        $actualSignature = $this->decodeSegment($encodedSignature);
        $expectedSignature = hash_hmac(
            'sha256',
            $encodedHeader.'.'.$encodedPayload,
            $this->signingSecret(),
            true,
        );

        if (! hash_equals($expectedSignature, $actualSignature)) {
            throw new AuthenticationException;
        }

        return $this->validatePayload($payload);
    }

    /**
     * JWT payload を HS256 で encode する。
     *
     * @param  array{sub: string, iat: int, exp: int}  $payload
     */
    private function encode(array $payload): string
    {
        $encodedHeader = $this->encodeSegment(json_encode([
            'typ' => 'JWT',
            'alg' => self::ALGORITHM,
        ], JSON_THROW_ON_ERROR));
        $encodedPayload = $this->encodeSegment(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac(
            'sha256',
            $encodedHeader.'.'.$encodedPayload,
            $this->signingSecret(),
            true,
        );

        return $encodedHeader.'.'.$encodedPayload.'.'.$this->encodeSegment($signature);
    }

    /**
     * JSON segment を連想配列として decode する。
     *
     * @return array<string, mixed>
     *
     * @throws AuthenticationException
     */
    private function decodeJsonSegment(string $segment): array
    {
        try {
            $decoded = json_decode($this->decodeSegment($segment), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new AuthenticationException;
        }

        if (! is_array($decoded)) {
            throw new AuthenticationException;
        }

        return $decoded;
    }

    /**
     * JWT payload の必須 claims と期限を検証する。
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws AuthenticationException
     */
    private function validatePayload(array $payload): int
    {
        $subject = $payload['sub'] ?? null;
        $issuedAt = $payload['iat'] ?? null;
        $expiresAt = $payload['exp'] ?? null;

        if (! is_string($subject) || ! ctype_digit($subject) || (int) $subject < 1) {
            throw new AuthenticationException;
        }

        if (! is_int($issuedAt) || ! is_int($expiresAt)) {
            throw new AuthenticationException;
        }

        $now = Carbon::now()->getTimestamp();

        if ($issuedAt > $now || $expiresAt <= $now) {
            throw new AuthenticationException;
        }

        return (int) $subject;
    }

    /**
     * base64url segment を encode する。
     */
    private function encodeSegment(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /**
     * base64url segment を decode する。
     *
     * @throws AuthenticationException
     */
    private function decodeSegment(string $value): string
    {
        $remainder = strlen($value) % 4;

        if ($remainder === 1) {
            throw new AuthenticationException;
        }

        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        if ($decoded === false) {
            throw new AuthenticationException;
        }

        return $decoded;
    }

    /**
     * JWT signing secret を config から取得する。
     */
    private function signingSecret(): string
    {
        $configuredSigningKey = $this->config->get('jwt.signing_secret');

        if (! is_string($configuredSigningKey) || trim($configuredSigningKey) === '') {
            throw new RuntimeException('JWT signing secret is not configured.');
        }

        return $configuredSigningKey;
    }

    /**
     * JWT TTL を秒数で返す。
     */
    private function ttlSeconds(): int
    {
        $ttlMinutes = $this->config->get('jwt.ttl_minutes', 60);

        if (! is_int($ttlMinutes) || $ttlMinutes < 1) {
            throw new RuntimeException('JWT TTL must be a positive integer.');
        }

        return $ttlMinutes * 60;
    }
}
