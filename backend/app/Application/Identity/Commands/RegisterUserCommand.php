<?php

declare(strict_types=1);

namespace App\Application\Identity\Commands;

use App\Application\Identity\DTOs\AuthenticatedUserDto;
use App\Application\Identity\DTOs\RegisterUserDto;
use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Application\Identity\Services\PasswordHasherInterface;
use App\Domain\Identity\Entities\User;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\HashedPassword;
use App\Domain\Identity\ValueObjects\Username;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class RegisterUserCommand
{
    public function __construct(
        private UserRepositoryInterface $users,
        private PasswordHasherInterface $passwords,
        private AuthTokenIssuerInterface $tokens,
    ) {}

    /**
     * User を登録し、API token を発行する。
     */
    public function execute(RegisterUserDto $dto): AuthenticatedUserDto
    {
        $email = new Email($dto->email);
        $username = new Username($dto->username);

        if ($this->users->emailExists($email)) {
            throw new DomainException('email has already been taken');
        }

        if ($this->users->usernameExists($username)) {
            throw new DomainException('username has already been taken');
        }

        $user = User::register(
            username: $username,
            email: $email,
            passwordHash: new HashedPassword($this->passwords->make($dto->password)),
        );

        return DB::transaction(function () use ($user): AuthenticatedUserDto {
            $registeredUser = $this->users->save($user);

            return new AuthenticatedUserDto(
                user: $registeredUser,
                token: $this->tokens->issue($registeredUser),
            );
        });
    }
}
