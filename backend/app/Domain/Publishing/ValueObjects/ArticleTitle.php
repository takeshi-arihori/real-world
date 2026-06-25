<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class ArticleTitle
{
    public string $value;

    /**
     * Article の title を表す。
     */
    public function __construct(string $value)
    {
        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 255) {
            throw new InvalidArgumentException('Article title is invalid.');
        }

        $this->value = $normalized;
    }
}
