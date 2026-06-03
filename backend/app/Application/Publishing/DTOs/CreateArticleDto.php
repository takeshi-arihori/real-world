<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class CreateArticleDto
{
    /**
     * @param  list<string>  $tagList
     */
    public function __construct(
        public string $title,
        public string $description,
        public string $body,
        public array $tagList,
    ) {}
}
