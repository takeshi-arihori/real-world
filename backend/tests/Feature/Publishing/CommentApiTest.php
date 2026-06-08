<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Comment API', function (): void {
    it('guestがArticleのComment一覧をRealWorld comments wrapperで取得できる', function (): void {
        $author = User::factory()->create([
            'username' => 'jake',
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);
        $otherAuthor = User::factory()->create(['username' => 'jane']);
        $articleId = commentApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);
        commentApiCreateComment($articleId, $otherAuthor, [
            'body' => 'Second comment',
            'created_at' => Carbon::parse('2026-05-02 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-02 00:00:00'),
        ]);
        commentApiCreateComment($articleId, $author, [
            'body' => 'First comment',
            'created_at' => Carbon::parse('2026-05-01 00:00:00'),
            'updated_at' => Carbon::parse('2026-05-01 00:00:00'),
        ]);

        $response = $this->getJson('/api/articles/how-to-train-your-dragon/comments');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'comments')
            ->assertJsonPath('comments.0.body', 'First comment')
            ->assertJsonPath('comments.0.createdAt', '2026-05-01T00:00:00.000Z')
            ->assertJsonPath('comments.0.updatedAt', '2026-05-01T00:00:00.000Z')
            ->assertJsonPath('comments.0.author.username', 'jake')
            ->assertJsonPath('comments.0.author.bio', 'I like APIs')
            ->assertJsonPath('comments.0.author.image', 'https://example.com/avatar.png')
            ->assertJsonPath('comments.0.author.following', false)
            ->assertJsonPath('comments.1.body', 'Second comment')
            ->assertJsonPath('comments.1.author.username', 'jane');
    });

    it('Comment一覧のauthor followingをoptional authで算出する', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $viewer = User::factory()->create(['username' => 'bob']);
        $articleId = commentApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);
        commentApiCreateComment($articleId, $author, ['body' => 'Nice article']);
        commentApiFollow($viewer, $author);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/articles/how-to-train-your-dragon/comments')
            ->assertOk()
            ->assertJsonPath('comments.0.author.following', true);

        Auth::forgetGuards();

        $this->withRealWorldToken('not-a-jwt')
            ->getJson('/api/articles/how-to-train-your-dragon/comments')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('認証済みUserがCommentを投稿してRealWorld comment wrapperを返す', function (): void {
        $author = User::factory()->create(['username' => 'jake']);
        $commenter = User::factory()->create([
            'username' => 'bob',
            'bio' => 'I write comments',
            'image' => 'https://example.com/bob.png',
        ]);
        commentApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $response = $this->withRealWorldToken($this->issueRealWorldTokenFor($commenter))
            ->postJson('/api/articles/how-to-train-your-dragon/comments', [
                'comment' => [
                    'body' => 'Nice article',
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('comment.body', 'Nice article')
            ->assertJsonPath('comment.author.username', 'bob')
            ->assertJsonPath('comment.author.bio', 'I write comments')
            ->assertJsonPath('comment.author.image', 'https://example.com/bob.png')
            ->assertJsonPath('comment.author.following', false)
            ->assertJsonStructure([
                'comment' => [
                    'id',
                    'createdAt',
                    'updatedAt',
                    'body',
                    'author' => ['username', 'bio', 'image', 'following'],
                ],
            ]);

        expect(DB::table('comments')->where('body', 'Nice article')->exists())->toBeTrue();
    });

    it('未認証投稿とvalidation failureを拒否する', function (): void {
        $author = User::factory()->create();
        $commenter = User::factory()->create();
        commentApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);

        $this->postJson('/api/articles/how-to-train-your-dragon/comments', [
            'comment' => ['body' => 'Nice article'],
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($commenter))
            ->postJson('/api/articles/how-to-train-your-dragon/comments', [
                'comment' => ['body' => ''],
            ])
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('Comment authorのみCommentを削除できる', function (): void {
        $articleAuthor = User::factory()->create(['username' => 'jake']);
        $commentAuthor = User::factory()->create(['username' => 'bob']);
        $other = User::factory()->create(['username' => 'other']);
        $articleId = commentApiCreateArticle($articleAuthor, ['slug' => 'how-to-train-your-dragon']);
        $commentId = commentApiCreateComment($articleId, $commentAuthor, ['body' => 'Delete me']);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($other))
            ->deleteJson("/api/articles/how-to-train-your-dragon/comments/{$commentId}")
            ->assertForbidden()
            ->assertJsonStructure(['errors' => ['body']]);

        Auth::forgetGuards();

        expect(DB::table('comments')->where('id', $commentId)->exists())->toBeTrue();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($commentAuthor))
            ->deleteJson("/api/articles/how-to-train-your-dragon/comments/{$commentId}")
            ->assertNoContent();

        expect(DB::table('comments')->where('id', $commentId)->exists())->toBeFalse();
    });

    it('存在しないArticleとCommentは404を返す', function (): void {
        $author = User::factory()->create();
        $commentAuthor = User::factory()->create();
        $articleId = commentApiCreateArticle($author, ['slug' => 'how-to-train-your-dragon']);
        $otherArticleId = commentApiCreateArticle($author, ['slug' => 'other-article']);
        $otherCommentId = commentApiCreateComment($otherArticleId, $commentAuthor, ['body' => 'Other article comment']);

        $this->getJson('/api/articles/missing-article/comments')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($commentAuthor))
            ->postJson('/api/articles/missing-article/comments', [
                'comment' => ['body' => 'Nice article'],
            ])
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);

        Auth::forgetGuards();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($commentAuthor))
            ->deleteJson('/api/articles/how-to-train-your-dragon/comments/999999')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);

        Auth::forgetGuards();

        $this->withRealWorldToken($this->issueRealWorldTokenFor($commentAuthor))
            ->deleteJson("/api/articles/how-to-train-your-dragon/comments/{$otherCommentId}")
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);

        expect(DB::table('comments')->where('article_id', $articleId)->count())->toBe(0);
    });
});

/**
 * @param  array<string, mixed>  $attributes
 */
function commentApiCreateArticle(User $author, array $attributes = []): int
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

/**
 * @param  array<string, mixed>  $attributes
 */
function commentApiCreateComment(int $articleId, User $author, array $attributes = []): int
{
    $createdAt = $attributes['created_at'] ?? Carbon::parse('2026-05-02 00:00:00');
    $updatedAt = $attributes['updated_at'] ?? $createdAt;

    return (int) DB::table('comments')->insertGetId([
        'article_id' => $articleId,
        'author_user_id' => $author->getKey(),
        'body' => $attributes['body'] ?? 'Nice article',
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
    ]);
}

function commentApiFollow(User $follower, User $followee): void
{
    DB::table('follows')->insert([
        'follower_user_id' => $follower->getKey(),
        'followee_user_id' => $followee->getKey(),
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}
