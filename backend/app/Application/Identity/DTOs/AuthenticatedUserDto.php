<?php

declare(strict_types=1);

namespace App\Application\Identity\DTOs;

use App\Domain\Identity\Entities\User;

final readonly class AuthenticatedUserDto
{
    public function __construct(
        public User $user,
        public string $token,
    ) {}
}
