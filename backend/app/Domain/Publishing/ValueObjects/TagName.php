<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class TagName
{
    public string $value;

    /**
     * Article に付与する Tag の名前を表す。
     */
    public function __construct(string $value)
    {
        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 50) {
            throw new InvalidArgumentException('Tag name is invalid.');
        }

        $this->value = $normalized;
    }
}
