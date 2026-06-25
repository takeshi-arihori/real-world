<?php

declare(strict_types=1);

namespace App\Application\Social\Queries;

use App\Application\Social\DTOs\ProfileDto;
use App\Domain\Identity\Exceptions\UserNotFoundException;
use App\Infrastructure\Persistence\Models\User as UserModel;
use Illuminate\Support\Facades\DB;

final readonly class GetProfileQuery
{
    /**
     * username に一致する Profile を現在 User 視点で取得する。
     */
    public function execute(string $username, ?int $currentUserId): ProfileDto
    {
        $user = UserModel::query()
            ->where('username', $username)
            ->first();

        if (! $user instanceof UserModel) {
            throw UserNotFoundException::forUsername($username);
        }

        return new ProfileDto(
            username: $user->username,
            bio: $user->bio,
            image: $user->image,
            following: $this->isFollowing($currentUserId, (int) $user->getKey()),
        );
    }

    /**
     * 現在 User が対象 User を follow 済みか確認する。
     */
    private function isFollowing(?int $currentUserId, int $targetUserId): bool
    {
        if ($currentUserId === null) {
            return false;
        }

        return DB::table('follows')
            ->where('follower_user_id', $currentUserId)
            ->where('followee_user_id', $targetUserId)
            ->exists();
    }
}
