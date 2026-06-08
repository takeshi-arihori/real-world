<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Exceptions;

use DomainException;

final class CommentNotFoundException extends DomainException
{
    /**
     * ID に一致する Comment が存在しないことを表す。
     */
    public static function forId(int $commentId): self
    {
        return new self("comment not found: {$commentId}");
    }
}
