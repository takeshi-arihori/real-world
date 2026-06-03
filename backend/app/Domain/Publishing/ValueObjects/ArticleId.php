<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class ArticleId
{
    /**
     * 正の整数 ID として Article を識別する。
     */
    public function __construct(public int $value)
    {
        if ($value < 1) {
            throw new InvalidArgumentException('Article id must be positive.');
        }
    }
}
