<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Application\Identity\Services\PasswordHasherInterface;
use App\Domain\Identity\Repositories\UserRepositoryInterface;
use App\Infrastructure\Identity\HashPasswordHasher;
use App\Infrastructure\Identity\JwtAuthTokenIssuer;
use App\Infrastructure\Persistence\Repositories\EloquentUserRepository;
use Illuminate\Support\ServiceProvider;

final class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);
        $this->app->bind(PasswordHasherInterface::class, HashPasswordHasher::class);
        $this->app->bind(AuthTokenIssuerInterface::class, JwtAuthTokenIssuer::class);
    }
}
