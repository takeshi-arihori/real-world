<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Social;

use App\Application\Social\DTOs\ProfileDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProfileDto
 */
final class ProfileResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld profile wrapper へ変換する。
     *
     * @return array{profile: array{username: string, bio: string|null, image: string|null, following: bool}}
     */
    public function toArray(Request $request): array
    {
        /** @var ProfileDto $profile */
        $profile = $this->resource;

        return [
            'profile' => [
                'username' => $profile->username,
                'bio' => $profile->bio,
                'image' => $profile->image,
                'following' => $profile->following,
            ],
        ];
    }
}
