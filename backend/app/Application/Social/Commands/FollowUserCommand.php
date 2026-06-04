<?php

declare(strict_types=1);

namespace App\Application\Social\Commands;

use App\Domain\Identity\Exceptions\UserNotFoundException;
use App\Infrastructure\Persistence\Models\User as UserModel;
use DomainException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final readonly class FollowUserCommand
{
    /**
     * 現在 User が対象 User を follow する。
     */
    public function execute(int $followerUserId, string $username): void
    {
        $target = $this->findTargetUser($username);
        $targetUserId = (int) $target->getKey();

        if ($followerUserId === $targetUserId) {
            throw new DomainException('cannot follow yourself');
        }

        DB::transaction(function () use ($followerUserId, $targetUserId): void {
            $now = Carbon::now();

            DB::table('follows')->insertOrIgnore([
                'follower_user_id' => $followerUserId,
                'followee_user_id' => $targetUserId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    /**
     * follow 対象 User を取得する。
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
