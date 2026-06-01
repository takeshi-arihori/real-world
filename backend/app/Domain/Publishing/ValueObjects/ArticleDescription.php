<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class ArticleDescription
{
    public string $value;

    /**
     * Article の description を表す。
     */
    public function __construct(string $value)
    {
        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 255) {
            throw new InvalidArgumentException('Article description is invalid.');
        }

        $this->value = $normalized;
    }
}
