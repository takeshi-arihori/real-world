<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class ArticleListDto
{
    /**
     * @param  list<ArticleViewDto>  $articles
     */
    public function __construct(
        public array $articles,
        public int $articlesCount,
    ) {}
}
