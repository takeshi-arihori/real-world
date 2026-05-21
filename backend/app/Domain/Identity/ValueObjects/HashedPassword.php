<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class HashedPassword
{
    public string $value;

    /**
     * 永続化可能な hash 済み password を表す。
     */
    public function __construct(string $value)
    {
        if (trim($value) === '') {
            throw new InvalidArgumentException('Password hash is required.');
        }

        $this->value = $value;
    }
}
