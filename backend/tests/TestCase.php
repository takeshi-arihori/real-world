<?php

namespace Tests;

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * RealWorld API 互換の plain text token を発行する。
     */
    protected function issueRealWorldTokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * RealWorld API 互換の `Token` auth scheme をテストリクエストへ設定する。
     */
    protected function withRealWorldToken(string $token): static
    {
        return $this->withHeaders(['Authorization' => 'Token '.$token]);
    }
}
