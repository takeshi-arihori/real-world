<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Tag API', function (): void {
    it('guestが登録済みTagのdistinct listをRealWorld wrapperで取得できる', function (): void {
        $author = User::factory()->create();
        tagApiCreateArticle($author, 'first-article', ['dragons', 'training']);
        tagApiCreateArticle($author, 'second-article', ['dragons', 'laravel']);

        $this->getJson('/api/tags')
            ->assertOk()
            ->assertExactJson([
                'tags' => ['dragons', 'laravel', 'training'],
            ]);
    });

    it('Tagが存在しない場合は空配列を返す', function (): void {
        $this->getJson('/api/tags')
            ->assertOk()
            ->assertExactJson([
                'tags' => [],
            ]);
    });

    it('開発seed後にHomeで確認できるTagが用意される', function (): void {
        $this->seed();

        expect(DB::table('users')->where('username', 'testuser')->exists())->toBeTrue();

        $response = $this->getJson('/api/tags')
            ->assertOk()
            ->assertJsonStructure(['tags']);

        expect($response->json('tags'))
            ->toBeArray()
            ->not->toBeEmpty();
    });
});

/**
 * @param  list<string>  $tagNames
 */
function tagApiCreateArticle(User $author, string $slug, array $tagNames): int
{
    $createdAt = Carbon::parse('2026-05-01 00:00:00');
    $articleId = DB::table('articles')->insertGetId([
        'author_user_id' => $author->getKey(),
        'slug' => $slug,
        'title' => str($slug)->replace('-', ' ')->title()->toString(),
        'description' => 'A seeded article for tag tests',
        'body' => 'Tag API test body',
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);

    foreach ($tagNames as $tagName) {
        $tagId = DB::table('tags')->where('name', $tagName)->value('id');

        if (! is_numeric($tagId)) {
            $tagId = DB::table('tags')->insertGetId([
                'name' => $tagName,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        DB::table('article_tag')->insertOrIgnore([
            'article_id' => (int) $articleId,
            'tag_id' => (int) $tagId,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    return (int) $articleId;
}
