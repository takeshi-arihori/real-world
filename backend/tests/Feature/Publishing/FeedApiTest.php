<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Feed API', function (): void {
    it('未認証feedを401で拒否する', function (): void {
        $author = User::factory()->create();
        feedApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $this->getJson('/api/articles/feed')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('followeeのArticleだけをcreated descとpaginationで返す', function (): void {
        $viewer = User::factory()->create(['username' => 'viewer']);
        $jake = User::factory()->create(['username' => 'jake']);
        $jane = User::factory()->create(['username' => 'jane']);
        $outsider = User::factory()->create(['username' => 'outsider']);

        feedApiFollow($viewer, $jake);
        feedApiFollow($viewer, $jane);

        $oldFolloweeArticleId = feedApiCreateArticle($jake, [
            'slug' => 'old-dragon',
            'title' => 'Old Dragon',
            'created_at' => Carbon::parse('2026-05-01 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-01 00:00:00'),
        ], ['dragons']);
        $latestFolloweeArticleId = feedApiCreateArticle($jane, [
            'slug' => 'new-dragon',
            'title' => 'New Dragon',
            'created_at' => Carbon::parse('2026-05-03 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-03 00:00:00'),
        ], ['dragons', 'training']);
        feedApiCreateArticle($outsider, [
            'slug' => 'outsider-post',
            'title' => 'Outsider Post',
            'created_at' => Carbon::parse('2026-05-04 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
        ], ['hidden']);
        feedApiFavorite($viewer, $latestFolloweeArticleId);

        $firstPage = $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/feed?limit=1&offset=0')
            ->assertOk()
            ->assertJsonPath('articlesCount', 2)
            ->assertJsonCount(1, 'articles')
            ->assertJsonPath('articles.0.slug', 'new-dragon')
            ->assertJsonPath('articles.0.tagList', ['dragons', 'training'])
            ->assertJsonPath('articles.0.favorited', true)
            ->assertJsonPath('articles.0.favoritesCount', 1)
            ->assertJsonPath('articles.0.author.username', 'jane')
            ->assertJsonPath('articles.0.author.following', true);

        expect($firstPage->json('articles.0'))->not->toHaveKey('body');

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/feed?limit=1&offset=1')
            ->assertOk()
            ->assertJsonPath('articlesCount', 2)
            ->assertJsonCount(1, 'articles')
            ->assertJsonPath('articles.0.slug', 'old-dragon')
            ->assertJsonPath('articles.0.favorited', false)
            ->assertJsonPath('articles.0.favoritesCount', 0)
            ->assertJsonPath('articles.0.author.username', 'jake')
            ->assertJsonPath('articles.0.author.following', true);

        expect(DB::table('articles')->where('id', $oldFolloweeArticleId)->exists())->toBeTrue();
    });

    it('followeeの記事がない場合は空のarticles wrapperを返す', function (): void {
        $viewer = User::factory()->create(['username' => 'viewer']);
        $outsider = User::factory()->create(['username' => 'outsider']);
        feedApiCreateArticle($outsider, ['slug' => 'outsider-post']);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/feed')
            ->assertOk()
            ->assertExactJson([
                'articles' => [],
                'articlesCount' => 0,
            ]);
    });

    it('feedのquery validation failureを422のerrors.bodyで返す', function (): void {
        $viewer = User::factory()->create();

        $response = $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/feed?limit=0&offset=-1');

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);

        expect($response->json('errors.body'))->toBeArray()->toHaveCount(2);
    });
});

/**
 * @param  array<string, mixed>  $attributes
 * @param  list<string>  $tagNames
 */
function feedApiCreateArticle(User $author, array $attributes = [], array $tagNames = []): int
{
    $createdAt = $attributes['created_at'] ?? Carbon::parse('2026-05-01 00:00:00');
    $updatedAt = $attributes['updated_at'] ?? $createdAt;

    $articleId = DB::table('articles')->insertGetId([
        'author_user_id' => $author->getKey(),
        'slug' => $attributes['slug'] ?? 'how-to-train-your-dragon',
        'title' => $attributes['title'] ?? 'How to train your dragon',
        'description' => $attributes['description'] ?? 'Ever wonder how?',
        'body' => $attributes['body'] ?? 'You have to believe',
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
    ]);

    foreach ($tagNames as $tagName) {
        feedApiAttachTag((int) $articleId, $tagName, $createdAt);
    }

    return (int) $articleId;
}

function feedApiAttachTag(int $articleId, string $tagName, Carbon $createdAt): void
{
    $tagId = DB::table('tags')->where('name', $tagName)->value('id');

    if (! is_numeric($tagId)) {
        $tagId = DB::table('tags')->insertGetId([
            'name' => $tagName,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    DB::table('article_tag')->insert([
        'article_id' => $articleId,
        'tag_id' => (int) $tagId,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);
}

function feedApiFollow(User $follower, User $followee): void
{
    DB::table('follows')->insert([
        'follower_user_id' => $follower->getKey(),
        'followee_user_id' => $followee->getKey(),
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}

function feedApiFavorite(User $user, int $articleId): void
{
    DB::table('favorites')->insert([
        'user_id' => $user->getKey(),
        'article_id' => $articleId,
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}
