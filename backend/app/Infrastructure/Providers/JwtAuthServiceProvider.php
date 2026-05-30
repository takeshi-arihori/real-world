<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Infrastructure\Identity\JwtTokenCodec;
use App\Infrastructure\Persistence\Models\User as UserModel;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

final class JwtAuthServiceProvider extends ServiceProvider
{
    private const TOKEN_ATTRIBUTE = 'realworld_token';

    /**
     * RealWorld `Token` scheme の JWT guard を登録する。
     */
    public function boot(JwtTokenCodec $tokens): void
    {
        Auth::viaRequest('realworld-jwt', function (Request $request) use ($tokens): ?Authenticatable {
            $token = $this->tokenFromRequest($request);

            if ($token === null) {
                return null;
            }

            $userId = $tokens->userIdFromToken($token);
            $user = UserModel::query()->find($userId);

            if (! $user instanceof UserModel) {
                return null;
            }

            $request->attributes->set(self::TOKEN_ATTRIBUTE, $token);

            return $user;
        });
    }

    /**
     * Public API の `Authorization: Token <jwt>` header を取り出す。
     *
     * @throws AuthenticationException
     */
    private function tokenFromRequest(Request $request): ?string
    {
        $authorization = $request->headers->get('Authorization');

        if ($authorization === null) {
            return null;
        }

        if (preg_match('/^Token\s+(.+)$/', $authorization, $matches) !== 1) {
            throw new AuthenticationException;
        }

        $token = trim($matches[1]);

        if ($token === '') {
            throw new AuthenticationException;
        }

        return $token;
    }
}
