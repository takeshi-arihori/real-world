<?php

declare(strict_types=1);

namespace App\Application\Identity\Commands;

use App\Application\Identity\DTOs\AuthenticatedUserDto;
use App\Application\Identity\DTOs\LoginUserDto;
use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Application\Identity\Services\PasswordHasherInterface;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Identity\ValueObjects\Email;
use DomainException;

final readonly class LoginUserCommand
{
    public function __construct(
        private UserRepositoryInterface $users,
        private PasswordHasherInterface $passwords,
        private AuthTokenIssuerInterface $tokens,
    ) {}

    /**
     * email と password を検証し、API token を発行する。
     */
    public function execute(LoginUserDto $dto): AuthenticatedUserDto
    {
        $user = $this->users->findByEmail(new Email($dto->email));

        if ($user === null || ! $this->passwords->check($dto->password, $user->passwordHash()->value)) {
            throw new DomainException('email or password is invalid');
        }

        return new AuthenticatedUserDto(
            user: $user,
            token: $this->tokens->issue($user),
        );
    }
}
