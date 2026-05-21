<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class Username
{
    public string $value;

    /**
     * User の公開識別子として使う username を表す。
     */
    public function __construct(string $value)
    {
        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 50) {
            throw new InvalidArgumentException('Username is invalid.');
        }

        $this->value = $normalized;
    }
}
