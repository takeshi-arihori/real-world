<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('POST /api/users/login', function (): void {
    it('ログイン成功時に200とRealWorld user wrapperを返す', function (): void {
        User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'password_hash' => Hash::make('secret'),
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);

        $response = $this->postJson('/api/users/login', [
            'user' => [
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'user' => [
                    'email',
                    'token',
                    'username',
                    'bio',
                    'image',
                ],
            ])
            ->assertJsonPath('user.email', 'jake@example.com')
            ->assertJsonPath('user.username', 'jake')
            ->assertJsonPath('user.bio', 'I like APIs')
            ->assertJsonPath('user.image', 'https://example.com/avatar.png');

        expect($response->json('user.token'))->toBeString()->not->toBe('');
    });

    it('誤ったcredentialsを422で拒否する', function (): void {
        User::factory()->create([
            'username' => 'jake',
            'email' => 'jake@example.com',
            'password_hash' => Hash::make('secret'),
        ]);

        $response = $this->postJson('/api/users/login', [
            'user' => [
                'email' => 'jake@example.com',
                'password' => 'wrong-password',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertExactJson([
                'errors' => [
                    'body' => ['email or password is invalid'],
                ],
            ]);
    });

    it('validation failureを422のerrors.bodyで返す', function (): void {
        $response = $this->postJson('/api/users/login', [
            'user' => [
                'email' => 'not-an-email',
                'password' => '',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);

        expect($response->json('errors.body'))->toBeArray()->not->toBeEmpty();
    });
});
