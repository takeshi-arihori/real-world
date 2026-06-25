<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class CreateCommentDto
{
    public function __construct(public string $body) {}
}
