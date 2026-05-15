<?php

declare(strict_types=1);

namespace App\Application\Identity\Services;

interface PasswordHasherInterface
{
    /**
     * 平文 password を hash 化する。
     */
    public function make(string $plainPassword): string;

    /**
     * 平文 password が hash と一致するか確認する。
     */
    public function check(string $plainPassword, string $hashedPassword): bool;
}
