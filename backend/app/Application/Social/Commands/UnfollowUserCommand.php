<?php

declare(strict_types=1);

namespace App\Application\Social\Commands;

use App\Domain\Identity\Exceptions\UserNotFoundException;
use App\Infrastructure\Persistence\Models\User as UserModel;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class UnfollowUserCommand
{
    /**
     * 現在 User が対象 User の follow を解除する。
     */
    public function execute(int $followerUserId, string $username): void
    {
        $target = $this->findTargetUser($username);
        $targetUserId = (int) $target->getKey();

        if ($followerUserId === $targetUserId) {
            throw new DomainException('cannot follow yourself');
        }

        DB::transaction(function () use ($followerUserId, $targetUserId): void {
            DB::table('follows')
                ->where('follower_user_id', $followerUserId)
                ->where('followee_user_id', $targetUserId)
                ->delete();
        });
    }

    /**
     * unfollow 対象 User を取得する。
     */
    private function findTargetUser(string $username): UserModel
    {
        $target = UserModel::query()
            ->where('username', $username)
            ->first();

        if (! $target instanceof UserModel) {
            throw UserNotFoundException::forUsername($username);
        }

        return $target;
    }
}
