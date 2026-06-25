<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class ArticleAuthorDto
{
    public function __construct(
        public string $username,
        public ?string $bio,
        public ?string $image,
        public bool $following,
    ) {}
}
