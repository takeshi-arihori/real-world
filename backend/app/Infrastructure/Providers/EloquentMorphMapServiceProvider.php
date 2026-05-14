<?php

declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

final class EloquentMorphMapServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Relation::morphMap([
            User::class => User::class,
            'App\\Models\\User' => User::class,
        ]);
    }
}
