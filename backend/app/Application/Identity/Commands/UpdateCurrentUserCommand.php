<?php

declare(strict_types=1);

namespace App\Application\Identity\Commands;

use App\Application\Identity\DTOs\UpdateCurrentUserDto;
use App\Application\Identity\Services\PasswordHasherInterface;
use App\Domain\Identity\Entities\User;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Identity\ValueObjects\Bio;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\HashedPassword;
use App\Domain\Identity\ValueObjects\Image;
use App\Domain\Identity\ValueObjects\UserId;
use App\Domain\Identity\ValueObjects\Username;
use DomainException;
use Illuminate\Support\Facades\DB;

final readonly class UpdateCurrentUserCommand
{
    public function __construct(
        private UserRepositoryInterface $users,
        private PasswordHasherInterface $passwords,
    ) {}

    /**
     * 現在 User の Identity 情報と profile fields を更新する。
     */
    public function execute(int $userId, UpdateCurrentUserDto $dto): User
    {
        $id = new UserId($userId);
        $currentUser = $this->users->findById($id);

        if ($currentUser === null) {
            throw new DomainException('user not found');
        }

        $email = $dto->email === null ? $currentUser->email() : new Email($dto->email);
        $username = $dto->username === null ? $currentUser->username() : new Username($dto->username);

        if ($dto->email !== null && $this->users->emailExistsExceptUser($email, $id)) {
            throw new DomainException('email has already been taken');
        }

        if ($dto->username !== null && $this->users->usernameExistsExceptUser($username, $id)) {
            throw new DomainException('username has already been taken');
        }

        $passwordHash = $dto->password !== null
            ? new HashedPassword($this->passwords->make($dto->password))
            : $currentUser->passwordHash();

        $updatedUser = $currentUser->withUpdatedIdentity(
            username: $username,
            email: $email,
            passwordHash: $passwordHash,
            bio: $dto->hasBio ? new Bio($dto->bio) : $currentUser->bio(),
            image: $dto->hasImage ? new Image($dto->image) : $currentUser->image(),
        );

        return DB::transaction(fn (): User => $this->users->update($updatedUser));
    }
}
