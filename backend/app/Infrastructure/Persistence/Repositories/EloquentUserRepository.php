<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Identity\Entities\User;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Identity\ValueObjects\Bio;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\HashedPassword;
use App\Domain\Identity\ValueObjects\Image;
use App\Domain\Identity\ValueObjects\UserId;
use App\Domain\Identity\ValueObjects\Username;
use App\Infrastructure\Persistence\Models\User as UserModel;

final class EloquentUserRepository implements UserRepositoryInterface
{
    /**
     * Email に一致する User を取得する。
     */
    public function findByEmail(Email $email): ?User
    {
        $model = UserModel::query()
            ->where('email', $email->value)
            ->first();

        return $model instanceof UserModel ? $this->toEntity($model) : null;
    }

    /**
     * Email が登録済みか確認する。
     */
    public function emailExists(Email $email): bool
    {
        return UserModel::query()
            ->where('email', $email->value)
            ->exists();
    }

    /**
     * Username が登録済みか確認する。
     */
    public function usernameExists(Username $username): bool
    {
        return UserModel::query()
            ->where('username', $username->value)
            ->exists();
    }

    /**
     * User を永続化し、採番済み ID を含む Entity を返す。
     */
    public function save(User $user): User
    {
        $model = new UserModel;
        $model->fill([
            'username' => $user->username()->value,
            'email' => $user->email()->value,
            'password_hash' => $user->passwordHash()->value,
            'bio' => $user->bio()->value,
            'image' => $user->image()->value,
        ]);
        $model->save();

        return $this->toEntity($model);
    }

    /**
     * 永続化モデルを Domain Entity へ変換する。
     */
    private function toEntity(UserModel $model): User
    {
        return new User(
            id: new UserId((int) $model->getKey()),
            username: new Username($model->username),
            email: new Email($model->email),
            passwordHash: new HashedPassword($model->password_hash),
            bio: new Bio($model->bio),
            image: new Image($model->image),
        );
    }
}
