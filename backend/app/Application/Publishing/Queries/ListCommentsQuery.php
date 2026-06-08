<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\CommentListDto;
use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use App\Infrastructure\Persistence\Models\Comment as CommentModel;

final readonly class ListCommentsQuery
{
    public function __construct(private CommentViewFactory $comments) {}

    /**
     * Article に属する Comment 一覧を取得する。
     */
    public function execute(string $slug, ?int $currentUserId): CommentListDto
    {
        $articleId = $this->articleIdForSlug($slug);
        $models = CommentModel::query()
            ->with('author')
            ->where('article_id', $articleId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return new CommentListDto(
            comments: $this->comments->fromModels($models, $currentUserId),
        );
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
