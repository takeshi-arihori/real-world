<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Publishing\Entities\Comment;
use App\Infrastructure\Persistence\Models\User;

final class CommentPolicy
{
    /**
     * Comment author のみ削除を許可する。
     */
    public function delete(User $user, Comment $comment): bool
    {
        return (int) $user->getKey() === $comment->authorUserId();
    }
}
