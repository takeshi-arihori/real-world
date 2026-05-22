<?php

declare(strict_types=1);

namespace App\Domain\Identity\Repositories;

use App\Domain\Identity\Entities\User;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\UserId;
use App\Domain\Identity\ValueObjects\Username;

interface UserRepositoryInterface
{
    /**
     * ID に一致する User を取得する。
     */
    public function findById(UserId $id): ?User;

    /**
     * Email に一致する User を取得する。
     */
    public function findByEmail(Email $email): ?User;

    /**
     * Email が登録済みか確認する。
     */
    public function emailExists(Email $email): bool;

    /**
     * 指定 User を除き、Email が登録済みか確認する。
     */
    public function emailExistsExceptUser(Email $email, UserId $exceptUserId): bool;

    /**
     * Username が登録済みか確認する。
     */
    public function usernameExists(Username $username): bool;

    /**
     * 指定 User を除き、Username が登録済みか確認する。
     */
    public function usernameExistsExceptUser(Username $username, UserId $exceptUserId): bool;

    /**
     * User を永続化し、採番済み ID を含む Entity を返す。
     */
    public function save(User $user): User;

    /**
     * 既存 User を更新し、更新後の Entity を返す。
     */
    public function update(User $user): User;
}
