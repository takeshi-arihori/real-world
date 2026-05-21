<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use App\Application\Identity\Services\PasswordHasherInterface;
use Illuminate\Support\Facades\Hash;

final class HashPasswordHasher implements PasswordHasherInterface
{
    /**
     * 平文 password を Laravel Hash で hash 化する。
     */
    public function make(string $plainPassword): string
    {
        return Hash::make($plainPassword);
    }

    /**
     * 平文 password が Laravel Hash と一致するか確認する。
     */
    public function check(string $plainPassword, string $hashedPassword): bool
    {
        return Hash::check($plainPassword, $hashedPassword);
    }
}
