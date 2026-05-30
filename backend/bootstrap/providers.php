<?php

use App\Infrastructure\Providers\EloquentMorphMapServiceProvider;
use App\Infrastructure\Providers\JwtAuthServiceProvider;
use App\Infrastructure\Providers\RepositoryServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    EloquentMorphMapServiceProvider::class,
    JwtAuthServiceProvider::class,
    RepositoryServiceProvider::class,
];
