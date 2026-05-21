<?php

declare(strict_types=1);

namespace App\Application\Identity\DTOs;

final readonly class UpdateCurrentUserDto
{
    public function __construct(
        public ?string $email,
        public ?string $username,
        public ?string $password,
        public bool $hasBio,
        public ?string $bio,
        public bool $hasImage,
        public ?string $image,
    ) {}
}
