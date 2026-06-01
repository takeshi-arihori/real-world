<?php

use App\Presentation\Http\Controllers\Identity\AuthController;
use App\Presentation\Http\Controllers\Identity\CurrentUserController;
use App\Presentation\Http\Controllers\Publishing\ArticleController;
use Illuminate\Support\Facades\Route;

Route::post('/users', [AuthController::class, 'register']);
Route::post('/users/login', [AuthController::class, 'login']);
Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
Route::get('/articles/{slug}', [ArticleController::class, 'show'])->name('articles.show');

Route::middleware('auth:api')->group(function (): void {
    Route::get('/user', [CurrentUserController::class, 'show']);
    Route::put('/user', [CurrentUserController::class, 'update']);
    Route::post('/articles', [ArticleController::class, 'store'])->name('articles.store');
    Route::put('/articles/{slug}', [ArticleController::class, 'update'])->name('articles.update');
    Route::delete('/articles/{slug}', [ArticleController::class, 'destroy'])->name('articles.destroy');
});
