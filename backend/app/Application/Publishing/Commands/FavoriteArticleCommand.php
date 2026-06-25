<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final readonly class FavoriteArticleCommand
{
    /**
     * 現在 User が Article を favorite する。
     */
    public function execute(int $userId, string $slug): void
    {
        $articleId = $this->articleIdForSlug($slug);

        DB::transaction(function () use ($userId, $articleId): void {
            $now = Carbon::now();

            DB::table('favorites')->insertOrIgnore([
                'user_id' => $userId,
                'article_id' => $articleId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
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
