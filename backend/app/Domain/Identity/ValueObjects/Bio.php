<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class Bio
{
    /**
     * Profile に表示する nullable な自己紹介文を表す。
     */
    public function __construct(public ?string $value)
    {
        if ($value !== null && strlen($value) > 1000) {
            throw new InvalidArgumentException('Bio is too long.');
        }
    }
}
