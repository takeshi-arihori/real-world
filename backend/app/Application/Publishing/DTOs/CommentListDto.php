<?php

declare(strict_types=1);

namespace App\Application\Publishing\DTOs;

final readonly class CommentListDto
{
    /**
     * @param  list<CommentViewDto>  $comments
     */
    public function __construct(public array $comments) {}
}
