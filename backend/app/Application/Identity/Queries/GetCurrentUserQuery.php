<?php

declare(strict_types=1);

namespace App\Application\Identity\Queries;

use App\Domain\Identity\Entities\User;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Identity\ValueObjects\UserId;
use DomainException;

final readonly class GetCurrentUserQuery
{
    public function __construct(
        private UserRepositoryInterface $users,
    ) {}

    /**
     * 認証済み User ID に一致する現在 User を取得する。
     */
    public function execute(int $userId): User
    {
        $user = $this->users->findById(new UserId($userId));

        if ($user === null) {
            throw new DomainException('user not found');
        }

        return $user;
    }
}
