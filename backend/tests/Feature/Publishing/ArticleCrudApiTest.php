<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Article CRUD API', function (): void {
    it('認証済みUserがArticleを作成してRealWorld article wrapperを返す', function (): void {
        $author = User::factory()->create([
            'username' => 'jake',
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);

        $response = $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->postJson('/api/articles', [
                'article' => [
                    'title' => 'How to train your dragon',
                    'description' => 'Ever wonder how?',
                    'body' => 'You have to believe',
                    'tagList' => ['dragons', 'training'],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('article.slug', 'how-to-train-your-dragon')
            ->assertJsonPath('article.title', 'How to train your dragon')
            ->assertJsonPath('article.description', 'Ever wonder how?')
            ->assertJsonPath('article.body', 'You have to believe')
            ->assertJsonPath('article.tagList', ['dragons', 'training'])
            ->assertJsonPath('article.favorited', false)
            ->assertJsonPath('article.favoritesCount', 0)
            ->assertJsonPath('article.author.username', 'jake')
            ->assertJsonPath('article.author.bio', 'I like APIs')
            ->assertJsonPath('article.author.image', 'https://example.com/avatar.png')
            ->assertJsonPath('article.author.following', false);

        expect(DB::table('articles')->where('slug', 'how-to-train-your-dragon')->exists())->toBeTrue()
            ->and(DB::table('tags')->pluck('name')->all())
            ->toContain('dragons')
            ->toContain('training');
    });

    it('slugが重複する場合はsuffix付きで一意なslugを生成する', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        articleApiCreateArticle($author, [
            'slug' => 'how-to-train-your-dragon',
            'title' => 'How to train your dragon',
        ]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->postJson('/api/articles', [
                'article' => [
                    'title' => 'How to train your dragon',
                    'description' => 'Ever wonder how?',
                    'body' => 'You have to believe',
                    'tagList' => [],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('article.slug', 'how-to-train-your-dragon-2');
    });

    it('未認証作成とvalidation failureを拒否する', function (): void {
        $this->postJson('/api/articles', [
            'article' => [
                'title' => 'How to train your dragon',
                'description' => 'Ever wonder how?',
                'body' => 'You have to believe',
            ],
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);

        $author = User::factory()->create();

        $response = $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->postJson('/api/articles', [
                'article' => [
                    'title' => '',
                    'description' => '',
                    'body' => '',
                    'tagList' => ['', 'dup', 'dup'],
                ],
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('Article一覧をfilterとpaginationつきで返しbodyを含めない', function (): void {
        $jake = User::factory()->create(['username' => 'jake']);
        $jane = User::factory()->create(['username' => 'jane']);
        $bob = User::factory()->create(['username' => 'bob']);
        articleApiCreateArticle($jake, [
            'slug' => 'old-dragon',
            'title' => 'Old Dragon',
            'created_at' => Carbon::parse('2026-05-01 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-01 00:00:00'),
        ], ['dragons']);
        $newDragonId = articleApiCreateArticle($jane, [
            'slug' => 'new-dragon',
            'title' => 'New Dragon',
            'created_at' => Carbon::parse('2026-05-03 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-03 00:00:00'),
        ], ['dragons', 'training']);
        articleApiCreateArticle($jake, [
            'slug' => 'laravel-api',
            'title' => 'Laravel API',
            'created_at' => Carbon::parse('2026-05-02 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-02 00:00:00'),
        ], ['php']);
        articleApiFavorite($bob, $newDragonId);

        $tagResponse = $this->getJson('/api/articles?tag=dragons&limit=1&offset=0')
            ->assertOk()
            ->assertJsonPath('articlesCount', 2)
            ->assertJsonCount(1, 'articles')
            ->assertJsonPath('articles.0.slug', 'new-dragon');

        expect($tagResponse->json('articles.0'))->not->toHaveKey('body');

        $this->getJson('/api/articles?author=jake')
            ->assertOk()
            ->assertJsonPath('articlesCount', 2)
            ->assertJsonPath('articles.0.slug', 'laravel-api')
            ->assertJsonPath('articles.1.slug', 'old-dragon');

        $this->getJson('/api/articles?favorited=bob')
            ->assertOk()
            ->assertJsonPath('articlesCount', 1)
            ->assertJsonPath('articles.0.slug', 'new-dragon');
    });

    it('Article詳細のfavoritedとfollowingをoptional authで算出する', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $viewer = User::factory()->create(['username' => 'bob']);
        $articleId = articleApiCreateArticle($author, [
            'slug' => 'how-to-train-your-dragon',
            'title' => 'How to train your dragon',
        ], ['dragons']);
        articleApiFavorite($viewer, $articleId);
        articleApiFollow($viewer, $author);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/how-to-train-your-dragon')
            ->assertOk()
            ->assertJsonPath('article.slug', 'how-to-train-your-dragon')
            ->assertJsonPath('article.favorited', true)
            ->assertJsonPath('article.favoritesCount', 1)
            ->assertJsonPath('article.author.following', true);

        $this->getJson('/api/articles/how-to-train-your-dragon')
            ->assertOk()
            ->assertJsonPath('article.favorited', false)
            ->assertJsonPath('article.favoritesCount', 1)
            ->assertJsonPath('article.author.following', false);
    });

    it('optional auth endpointでも無効JWTは401を返す', function (): void {
        $author = User::factory()->create();
        articleApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $this->withRealWorldToken('not-a-jwt')
            ->getJson('/api/articles/how-to-train-your-dragon')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('authorのみArticleを更新できtitle変更時にslugを再生成する', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $other = User::factory()->create(['username' => 'other']);
        articleApiCreateArticle($author, ['slug' => 'did-you-train-your-dragon']);
        articleApiCreateArticle($author, [
            'slug' => 'how-to-train-your-dragon',
            'title' => 'How to train your dragon',
        ]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($other))
            ->putJson('/api/articles/how-to-train-your-dragon', [
                'article' => ['title' => 'Hacked'],
            ])
            ->assertForbidden()
            ->assertJsonStructure(['errors' => ['body']]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->putJson('/api/articles/how-to-train-your-dragon', [
                'article' => [
                    'title' => 'Did you train your dragon',
                    'description' => 'Updated summary',
                    'body' => 'Updated body',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('article.slug', 'did-you-train-your-dragon-2')
            ->assertJsonPath('article.title', 'Did you train your dragon')
            ->assertJsonPath('article.description', 'Updated summary')
            ->assertJsonPath('article.body', 'Updated body');

        expect(DB::table('articles')->where('slug', 'how-to-train-your-dragon')->exists())->toBeFalse()
            ->and(DB::table('articles')->where('slug', 'did-you-train-your-dragon-2')->exists())->toBeTrue();
    });

    it('存在しないslugの更新は404を返す', function (): void {
        $author = User::factory()->create();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->putJson('/api/articles/missing-article', [
                'article' => ['title' => 'Missing'],
            ])
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('authorのみArticleを削除できる', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $other = User::factory()->create(['username' => 'other']);
        $articleId = articleApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($other))
            ->deleteJson('/api/articles/how-to-train-your-dragon')
            ->assertForbidden()
            ->assertJsonStructure(['errors' => ['body']]);

        expect(DB::table('articles')->where('id', $articleId)->exists())->toBeTrue();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->deleteJson('/api/articles/how-to-train-your-dragon')
            ->assertNoContent();

        expect(DB::table('articles')->where('id', $articleId)->exists())->toBeFalse();
    });

    it('存在しないslugの詳細と削除は404を返す', function (): void {
        $author = User::factory()->create();

        $this->getJson('/api/articles/missing-article')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($author))
            ->deleteJson('/api/articles/missing-article')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);
    });
});

/**
 * @param  array<string, mixed>  $attributes
 * @param  list<string>  $tagNames
 */
function articleApiCreateArticle(User $author, array $attributes = [], array $tagNames = []): int
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
        articleApiAttachTag((int) $articleId, $tagName, $createdAt);
    }

    return (int) $articleId;
}

function articleApiAttachTag(int $articleId, string $tagName, Carbon $createdAt): void
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

function articleApiFavorite(User $user, int $articleId): void
{
    DB::table('favorites')->insert([
        'user_id' => $user->getKey(),
        'article_id' => $articleId,
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}

function articleApiFollow(User $follower, User $followee): void
{
    DB::table('follows')->insert([
        'follower_user_id' => $follower->getKey(),
        'followee_user_id' => $followee->getKey(),
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}
