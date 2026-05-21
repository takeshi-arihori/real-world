<?php

declare(strict_types=1);

namespace App\Domain\Identity\Repositories;

use App\Domain\Identity\Entities\User;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\Username;

interface UserRepositoryInterface
{
    /**
     * Email に一致する User を取得する。
     */
    public function findByEmail(Email $email): ?User;

    /**
     * Email が登録済みか確認する。
     */
    public function emailExists(Email $email): bool;

    /**
     * Username が登録済みか確認する。
     */
    public function usernameExists(Username $username): bool;

    /**
     * User を永続化し、採番済み ID を含む Entity を返す。
     */
    public function save(User $user): User;
}
