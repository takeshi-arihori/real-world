<?php

declare(strict_types=1);

namespace App\Application\Social\DTOs;

final readonly class ProfileDto
{
    public function __construct(
        public string $username,
        public ?string $bio,
        public ?string $image,
        public bool $following,
    ) {}
}
