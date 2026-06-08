<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class CommentViewDto
{
    public function __construct(
        public int $id,
        public string $createdAt,
        public string $updatedAt,
        public string $body,
        public CommentAuthorDto $author,
    ) {}
}
