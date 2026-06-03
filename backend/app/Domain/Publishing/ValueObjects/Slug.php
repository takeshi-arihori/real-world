<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class Slug
{
    public string $value;

    /**
     * URL path segment として使う Article slug を表す。
     */
    public function __construct(string $value)
    {
        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 255) {
            throw new InvalidArgumentException('Slug is invalid.');
        }

        $this->value = $normalized;
    }
}
