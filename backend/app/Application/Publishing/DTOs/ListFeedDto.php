<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class ListFeedDto
{
    public function __construct(
        public int $limit,
        public int $offset,
    ) {}
}
