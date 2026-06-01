<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Exceptions;

use DomainException;

final class ArticleNotFoundException extends DomainException
{
    /**
     * slug に一致する Article が存在しないことを表す。
     */
    public static function forSlug(string $slug): self
    {
        return new self("article not found: {$slug}");
    }
}
