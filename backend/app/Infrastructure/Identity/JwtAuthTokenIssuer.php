<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Domain\Identity\Entities\User;
use RuntimeException;

final readonly class JwtAuthTokenIssuer implements AuthTokenIssuerInterface
{
    public function __construct(private JwtTokenCodec $tokens) {}

    /**
     * User に対する Public API JWT を発行する。
     */
    public function issue(User $user): string
    {
        $id = $user->id();

        if ($id === null) {
            throw new RuntimeException('Cannot issue token for unsaved user.');
        }

        return $this->tokens->issueForUserId($id->value);
    }
}
