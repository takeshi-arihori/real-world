<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('GET /api/user', function (): void {
    it('未認証リクエストを401で拒否する', function (): void {
        $this->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('認証済みUserをRealWorld user wrapperで返す', function (): void {
        $user = User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);
        $token = $this->issueRealWorldTokenFor($user);

        $this->withRealWorldToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertExactJson([
                'user' => [
                    'email' => 'jake@example.com',
                    'token' => $token,
                    'username' => 'jake',
                    'bio' => 'I like APIs',
                    'image' => 'https://example.com/avatar.png',
                ],
            ]);
    });
});

describe('PUT /api/user', function (): void {
    it('未認証リクエストを401で拒否する', function (): void {
        $this->putJson('/api/user', [
            'user' => [
                'bio' => 'I like APIs',
            ],
        ])
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('現在Userのemail username password bio imageを更新してuser wrapperを返す', function (): void {
        $user = User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'password_hash' => Hash::make('secret'),
            'bio' => null,
            'image' => null,
        ]);
        $token = $this->issueRealWorldTokenFor($user);

        $this->withRealWorldToken($token)
            ->putJson('/api/user', [
                'user' => [
                    'email' => 'new-jake@example.com',
                    'username' => 'new-jake',
                    'password' => 'new-secret',
                    'bio' => 'I like secure APIs',
                    'image' => 'https://example.com/new-avatar.png',
                ],
            ])
            ->assertOk()
            ->assertExactJson([
                'user' => [
                    'email' => 'new-jake@example.com',
                    'token' => $token,
                    'username' => 'new-jake',
                    'bio' => 'I like secure APIs',
                    'image' => 'https://example.com/new-avatar.png',
                ],
            ]);

        $user->refresh();

        expect($user->email)->toBe('new-jake@example.com')
            ->and($user->username)->toBe('new-jake')
            ->and($user->bio)->toBe('I like secure APIs')
            ->and($user->image)->toBe('https://example.com/new-avatar.png')
            ->and($user->password_hash)->not->toBe('new-secret')
            ->and(Hash::check('new-secret', $user->password_hash))->toBeTrue();
    });

    it('nullable profile fieldsをnullでクリアできる', function (): void {
        $user = User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);
        $token = $this->issueRealWorldTokenFor($user);

        $this->withRealWorldToken($token)
            ->putJson('/api/user', [
                'user' => [
                    'bio' => null,
                    'image' => null,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('user.bio', null)
            ->assertJsonPath('user.image', null)
            ->assertJsonPath('user.email', 'jake@example.com')
            ->assertJsonPath('user.username', 'jake');

        $user->refresh();

        expect($user->bio)->toBeNull()
            ->and($user->image)->toBeNull();
    });

    it('現在User自身のemailとusernameはunique衝突として扱わない', function (): void {
        $user = User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'bio' => null,
        ]);
        $token = $this->issueRealWorldTokenFor($user);

        $this->withRealWorldToken($token)
            ->putJson('/api/user', [
                'user' => [
                    'email' => 'jake@example.com',
                    'username' => 'jake',
                    'bio' => 'Still Jake',
                ],
            ])
            ->assertOk()
            ->assertJsonPath('user.email', 'jake@example.com')
            ->assertJsonPath('user.username', 'jake')
            ->assertJsonPath('user.bio', 'Still Jake');
    });

    it('重複email username 無効URL 短すぎるpasswordを422で拒否する', function (): void {
        User::factory()->create([
            'username' => 'existing',
            'email' => 'existing@example.com',
        ]);
        $user = User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
        ]);
        $token = $this->issueRealWorldTokenFor($user);

        $response = $this->withRealWorldToken($token)
            ->putJson('/api/user', [
                'user' => [
                    'email' => 'existing@example.com',
                    'username' => 'existing',
                    'password' => 'short',
                    'image' => 'not-a-url',
                ],
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);

        expect($response->json('errors.body'))->toBeArray()->toHaveCount(4);
    });
});
