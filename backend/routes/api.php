<?php

use App\Presentation\Http\Controllers\Identity\AuthController;
use App\Presentation\Http\Controllers\Identity\CurrentUserController;
use Illuminate\Support\Facades\Route;

Route::post('/users', [AuthController::class, 'register']);
Route::post('/users/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [CurrentUserController::class, 'show']);
    Route::put('/user', [CurrentUserController::class, 'update']);
});
