<?php

declare(strict_types=1);

namespace App\Domain\Identity\Exceptions;

use DomainException;

final class UserNotFoundException extends DomainException
{
    /**
     * username に一致する User が存在しないことを表す。
     */
    public static function forUsername(string $username): self
    {
        return new self("user not found: {$username}");
    }
}
