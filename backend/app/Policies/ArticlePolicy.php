<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Publishing\Entities\Article;
use App\Infrastructure\Persistence\Models\User;

final class ArticlePolicy
{
    /**
     * Article author のみ更新を許可する。
     */
    public function update(User $user, Article $article): bool
    {
        return (int) $user->getKey() === $article->authorUserId();
    }

    /**
     * Article author のみ削除を許可する。
     */
    public function delete(User $user, Article $article): bool
    {
        return (int) $user->getKey() === $article->authorUserId();
    }
}
