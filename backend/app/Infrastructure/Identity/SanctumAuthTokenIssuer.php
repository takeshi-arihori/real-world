<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Domain\Identity\Entities\User;
use App\Infrastructure\Persistence\Models\User as UserModel;
use RuntimeException;

final class SanctumAuthTokenIssuer implements AuthTokenIssuerInterface
{
    /**
     * Sanctum personal access token を発行する。
     */
    public function issue(User $user): string
    {
        $id = $user->id();

        if ($id === null) {
            throw new RuntimeException('Cannot issue token for unsaved user.');
        }

        $model = UserModel::query()->findOrFail($id->value);

        return $model->createToken('api')->plainTextToken;
    }
}
