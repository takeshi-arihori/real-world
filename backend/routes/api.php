<?php

use App\Presentation\Http\Controllers\Identity\AuthController;
use App\Presentation\Http\Controllers\Identity\CurrentUserController;
use App\Presentation\Http\Controllers\Publishing\ArticleController;
use App\Presentation\Http\Controllers\Social\ProfileController;
use Illuminate\Support\Facades\Route;

Route::post('/users', [AuthController::class, 'register']);
Route::post('/users/login', [AuthController::class, 'login']);
Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
Route::get('/articles/{slug}', [ArticleController::class, 'show'])->name('articles.show');
Route::get('/profiles/{username}', [ProfileController::class, 'show'])->name('profiles.show');

Route::middleware('auth:api')->group(function (): void {
    Route::get('/user', [CurrentUserController::class, 'show']);
    Route::put('/user', [CurrentUserController::class, 'update']);
    Route::post('/articles', [ArticleController::class, 'store'])->name('articles.store');
    Route::put('/articles/{slug}', [ArticleController::class, 'update'])->name('articles.update');
    Route::delete('/articles/{slug}', [ArticleController::class, 'destroy'])->name('articles.destroy');
    Route::post('/articles/{slug}/favorite', [ArticleController::class, 'favorite'])->name('articles.favorite');
    Route::delete('/articles/{slug}/favorite', [ArticleController::class, 'unfavorite'])->name('articles.unfavorite');
    Route::post('/profiles/{username}/follow', [ProfileController::class, 'follow'])->name('profiles.follow');
    Route::delete('/profiles/{username}/follow', [ProfileController::class, 'unfollow'])->name('profiles.unfollow');
});
