<?php

declare(strict_types=1);

use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Infrastructure\Persistence\Repositories\EloquentUserRepository;
use Tests\TestCase;

uses(TestCase::class);

describe('Repository service provider', function (): void {
    it('UserRepositoryInterfaceをEloquent実装として解決する', function (): void {
        $repository = $this->app->make(UserRepositoryInterface::class);

        expect($repository)->toBeInstanceOf(EloquentUserRepository::class);
    });
});
