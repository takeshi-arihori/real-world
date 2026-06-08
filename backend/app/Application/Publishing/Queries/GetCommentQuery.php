<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\CommentViewDto;
use App\Domain\Publishing\Exceptions\CommentNotFoundException;
use App\Infrastructure\Persistence\Models\Comment as CommentModel;

final readonly class GetCommentQuery
{
    public function __construct(private CommentViewFactory $comments) {}

    /**
     * ID に一致する Comment を response DTO として取得する。
     */
    public function execute(int $commentId, ?int $currentUserId): CommentViewDto
    {
        $model = CommentModel::query()
            ->with('author')
            ->find($commentId);

        if (! $model instanceof CommentModel) {
            throw CommentNotFoundException::forId($commentId);
        }

        return $this->comments->fromModel($model, $currentUserId);
    }
}
