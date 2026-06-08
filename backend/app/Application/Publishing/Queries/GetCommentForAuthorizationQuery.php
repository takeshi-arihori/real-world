<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Domain\Publishing\Entities\Comment;
use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Domain\Publishing\Exceptions\CommentNotFoundException;
use App\Domain\Publishing\ValueObjects\CommentBody;
use App\Domain\Publishing\ValueObjects\CommentId;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use App\Infrastructure\Persistence\Models\Comment as CommentModel;

final readonly class GetCommentForAuthorizationQuery
{
    /**
     * slug と Comment ID に一致する Comment を認可判定用 Entity として取得する。
     */
    public function execute(string $slug, int $commentId): Comment
    {
        $articleId = $this->articleIdForSlug($slug);
        $model = CommentModel::query()
            ->where('article_id', $articleId)
            ->find($commentId);

        if (! $model instanceof CommentModel) {
            throw CommentNotFoundException::forId($commentId);
        }

        return new Comment(
            id: new CommentId((int) $model->getKey()),
            articleId: $model->article_id,
            authorUserId: $model->author_user_id,
            body: new CommentBody($model->body),
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
