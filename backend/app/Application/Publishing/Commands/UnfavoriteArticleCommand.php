<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use Illuminate\Support\Facades\DB;

final readonly class UnfavoriteArticleCommand
{
    /**
     * 現在 User が Article の favorite を解除する。
     */
    public function execute(int $userId, string $slug): void
    {
        $articleId = $this->articleIdForSlug($slug);

        DB::transaction(function () use ($userId, $articleId): void {
            DB::table('favorites')
                ->where('user_id', $userId)
                ->where('article_id', $articleId)
                ->delete();
        });
    }

    /**
     * slug に一致する Article ID を取得する。
     */
    private function articleIdForSlug(string $slug): int
    {
        $articleId = ArticleModel::query()
            ->where('slug', $slug)
            ->value('id');

        if (! is_numeric($articleId)) {
            throw ArticleNotFoundException::forSlug($slug);
        }

        return (int) $articleId;
    }
}
