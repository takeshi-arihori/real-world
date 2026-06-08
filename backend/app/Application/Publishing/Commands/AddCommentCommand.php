<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Application\Publishing\DTOs\CreateCommentDto;
use App\Domain\Publishing\Entities\Comment;
use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Domain\Publishing\ValueObjects\CommentBody;
use App\Domain\Publishing\ValueObjects\CommentId;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use Illuminate\Support\Facades\DB;

final readonly class AddCommentCommand
{
    /**
     * 認証済み User が Article へ Comment を追加する。
     */
    public function execute(int $authorUserId, string $slug, CreateCommentDto $dto): Comment
    {
        $articleId = $this->articleIdForSlug($slug);
        $comment = Comment::create(
            articleId: $articleId,
            authorUserId: $authorUserId,
            body: new CommentBody($dto->body),
        );

        return DB::transaction(function () use ($comment): Comment {
            $commentId = DB::table('comments')->insertGetId([
                'article_id' => $comment->articleId(),
                'author_user_id' => $comment->authorUserId(),
                'body' => $comment->body()->value,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $comment->withId(new CommentId((int) $commentId));
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
