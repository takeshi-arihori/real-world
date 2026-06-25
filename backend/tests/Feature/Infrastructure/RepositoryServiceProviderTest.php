<?php

declare(strict_types=1);

use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Infrastructure\Identity\JwtAuthTokenIssuer;
use App\Infrastructure\Persistence\Repositories\EloquentArticleRepository;
use App\Infrastructure\Persistence\Repositories\EloquentUserRepository;
use Tests\TestCase;

uses(TestCase::class);

describe('Repository service provider', function (): void {
    it('UserRepositoryInterfaceをEloquent実装として解決する', function (): void {
        $repository = $this->app->make(UserRepositoryInterface::class);

        expect($repository)->toBeInstanceOf(EloquentUserRepository::class);
    });

    it('ArticleRepositoryInterfaceをEloquent実装として解決する', function (): void {
        $repository = $this->app->make(ArticleRepositoryInterface::class);

        expect($repository)->toBeInstanceOf(EloquentArticleRepository::class);
    });

    it('AuthTokenIssuerInterfaceをJWT実装として解決する', function (): void {
        $issuer = $this->app->make(AuthTokenIssuerInterface::class);

        expect($issuer)->toBeInstanceOf(JwtAuthTokenIssuer::class);
    });
});
