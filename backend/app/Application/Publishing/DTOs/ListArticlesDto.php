<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class ListArticlesDto
{
    public function __construct(
        public ?string $tag,
        public ?string $author,
        public ?string $favorited,
        public int $limit,
        public int $offset,
    ) {}
}
