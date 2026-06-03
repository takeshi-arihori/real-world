<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class ArticleBody
{
    public string $value;

    /**
     * Article の本文を表す。
     */
    public function __construct(string $value)
    {
        if (trim($value) === '') {
            throw new InvalidArgumentException('Article body is invalid.');
        }

        $this->value = $value;
    }
}
