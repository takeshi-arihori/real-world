<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Identity;

use App\Application\Identity\DTOs\AuthenticatedUserDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuthenticatedUserDto
 */
final class UserResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld user wrapper へ変換する。
     *
     * @return array{user: array{email: string, token: string, username: string, bio: string|null, image: string|null}}
     */
    public function toArray(Request $request): array
    {
        /** @var AuthenticatedUserDto $authenticatedUser */
        $authenticatedUser = $this->resource;
        $user = $authenticatedUser->user;

        return [
            'user' => [
                'email' => $user->email()->value,
                'token' => $authenticatedUser->token,
                'username' => $user->username()->value,
                'bio' => $user->bio()->value,
                'image' => $user->image()->value,
            ],
        ];
    }
}
