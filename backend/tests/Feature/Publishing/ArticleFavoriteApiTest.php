<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Article Favorite API', function (): void {
    it('未認証favoriteを401で拒否する', function (): void {
        $author = User::factory()->create();
        favoriteApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $this->postJson('/api/articles/how-to-train-your-dragon/favorite')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('Articleをidempotentにfavoriteしてarticle wrapperを返す', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $viewer = User::factory()->create(['username' => 'bob']);
        favoriteApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $token = $this->issueRealWorldTokenFor($viewer);

        $this->withRealWorldToken($token)
            ->postJson('/api/articles/how-to-train-your-dragon/favorite')
            ->assertOk()
            ->assertJsonPath('article.slug', 'how-to-train-your-dragon')
            ->assertJsonPath('article.favorited', true)
            ->assertJsonPath('article.favoritesCount', 1);

        $this->withRealWorldToken($token)
            ->postJson('/api/articles/how-to-train-your-dragon/favorite')
            ->assertOk()
            ->assertJsonPath('article.favorited', true)
            ->assertJsonPath('article.favoritesCount', 1);

        expect(DB::table('favorites')->count())->toBe(1);
    });

    it('Articleをidempotentにunfavoriteしてarticle wrapperを返す', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $viewer = User::factory()->create(['username' => 'bob']);
        $articleId = favoriteApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);
        favoriteApiFavorite($viewer, $articleId);

        $token = $this->issueRealWorldTokenFor($viewer);

        $this->withRealWorldToken($token)
            ->deleteJson('/api/articles/how-to-train-your-dragon/favorite')
            ->assertOk()
            ->assertJsonPath('article.slug', 'how-to-train-your-dragon')
            ->assertJsonPath('article.favorited', false)
            ->assertJsonPath('article.favoritesCount', 0);

        $this->withRealWorldToken($token)
            ->deleteJson('/api/articles/how-to-train-your-dragon/favorite')
            ->assertOk()
            ->assertJsonPath('article.favorited', false)
            ->assertJsonPath('article.favoritesCount', 0);

        expect(DB::table('favorites')->count())->toBe(0);
    });

    it('存在しないArticleのfavoriteは404のerrors.bodyを返す', function (): void {
        $viewer = User::factory()->create();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->postJson('/api/articles/missing-article/favorite')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);
    });
});

/**
 * @param  array<string, mixed>  $attributes
 */
function favoriteApiCreateArticle(User $author, array $attributes = []): int
{
    $createdAt = $attributes['created_at'] ?? Carbon::parse('2026-05-01 00:00:00');
    $updatedAt = $attributes['updated_at'] ?? $createdAt;

    return (int) DB::table('articles')->insertGetId([
        'author_user_id' => $author->getKey(),
        'slug' => $attributes['slug'] ?? 'how-to-train-your-dragon',
        'title' => $attributes['title'] ?? 'How to train your dragon',
        'description' => $attributes['description'] ?? 'Ever wonder how?',
        'body' => $attributes['body'] ?? 'You have to believe',
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
    ]);
}

function favoriteApiFavorite(User $user, int $articleId): void
{
    DB::table('favorites')->insert([
        'user_id' => $user->getKey(),
        'article_id' => $articleId,
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}
