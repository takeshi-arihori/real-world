<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Entities;

use App\Domain\Publishing\ValueObjects\CommentBody;
use App\Domain\Publishing\ValueObjects\CommentId;
use InvalidArgumentException;

final readonly class Comment
{
    public function __construct(
        private ?CommentId $id,
        private int $articleId,
        private int $authorUserId,
        private CommentBody $body,
    ) {
        if ($articleId < 1) {
            throw new InvalidArgumentException('Comment article id must be positive.');
        }

        if ($authorUserId < 1) {
            throw new InvalidArgumentException('Comment author user id must be positive.');
        }
    }

    /**
     * 新規 Comment を生成する。
     */
    public static function create(int $articleId, int $authorUserId, CommentBody $body): self
    {
        return new self(
            id: null,
            articleId: $articleId,
            authorUserId: $authorUserId,
            body: $body,
        );
    }

    /**
     * 永続化後の ID を持つ Comment として複製する。
     */
    public function withId(CommentId $id): self
    {
        return new self(
            id: $id,
            articleId: $this->articleId,
            authorUserId: $this->authorUserId,
            body: $this->body,
        );
    }

    public function id(): ?CommentId
    {
        return $this->id;
    }

    public function articleId(): int
    {
        return $this->articleId;
    }

    public function authorUserId(): int
    {
        return $this->authorUserId;
    }

    public function body(): CommentBody
    {
        return $this->body;
    }
}
