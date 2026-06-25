<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class CommentId
{
    /**
     * Comment の識別子を表す。
     */
    public function __construct(public int $value)
    {
        if ($value < 1) {
            throw new InvalidArgumentException('Comment id must be positive.');
        }
    }
}
