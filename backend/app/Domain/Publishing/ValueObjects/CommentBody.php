<?php

declare(strict_types=1);

namespace App\Domain\Publishing\ValueObjects;

use InvalidArgumentException;

final readonly class CommentBody
{
    public string $value;

    /**
     * Comment の本文を表す。
     */
    public function __construct(string $value)
    {
        if (trim($value) === '') {
            throw new InvalidArgumentException('Comment body is invalid.');
        }

        $this->value = $value;
    }
}
