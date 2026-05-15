<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class UserId
{
    /**
     * 正の整数 ID として User を識別する。
     */
    public function __construct(public int $value)
    {
        if ($value < 1) {
            throw new InvalidArgumentException('User id must be positive.');
        }
    }
}
