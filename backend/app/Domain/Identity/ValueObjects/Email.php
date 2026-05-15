<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class Email
{
    public string $value;

    /**
     * ログイン識別子として使う email を表す。
     */
    public function __construct(string $value)
    {
        $normalized = strtolower(trim($value));

        if ($normalized === '' || strlen($normalized) > 255 || filter_var($normalized, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('Email is invalid.');
        }

        $this->value = $normalized;
    }
}
