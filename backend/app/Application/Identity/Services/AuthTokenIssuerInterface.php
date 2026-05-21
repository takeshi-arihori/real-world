<?php

declare(strict_types=1);

namespace App\Application\Identity\Services;

use App\Domain\Identity\Entities\User;

interface AuthTokenIssuerInterface
{
    /**
     * User に対する API token を発行する。
     */
    public function issue(User $user): string;
}
