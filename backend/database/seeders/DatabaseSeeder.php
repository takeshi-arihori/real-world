<?php

namespace Database\Seeders;

use App\Infrastructure\Persistence\Models\Article;
use App\Infrastructure\Persistence\Models\Tag;
use App\Infrastructure\Persistence\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::query()->updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'username' => 'testuser',
            'password_hash' => Hash::make('password'),
        ]);

        $article = Article::query()->updateOrCreate([
            'slug' => 'welcome-to-realworld',
        ], [
            'author_user_id' => $user->getKey(),
            'title' => 'Welcome to RealWorld',
            'description' => 'A demo article for the Home feed',
            'body' => 'This article seeds tags for local development.',
            'created_at' => Carbon::parse('2026-05-01 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-01 00:00:00'),
        ]);

        $tagIds = collect(['laravel', 'react', 'realworld'])
            ->map(fn (string $name): int => (int) Tag::query()->updateOrCreate(['name' => $name])->getKey())
            ->all();

        $article->tags()->sync($tagIds);
    }
}
