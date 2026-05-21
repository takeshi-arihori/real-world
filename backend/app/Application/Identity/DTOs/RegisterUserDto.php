<?php

declare(strict_types=1);

namespace App\Application\Identity\DTOs;

final readonly class RegisterUserDto
{
    public function __construct(
        public string $username,
        public string $email,
        public string $password,
    ) {}
}
