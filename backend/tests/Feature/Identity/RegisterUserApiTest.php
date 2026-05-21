<?php

declare(strict_types=1);

use App\Application\Identity\Services\AuthTokenIssuerInterface;
use App\Domain\Identity\Entities\User as DomainUser;
use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('POST /api/users', function (): void {
    it('登録成功時に201とRealWorld user wrapperを返す', function (): void {
        $response = $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ]);

        $response
            ->assertCreated()
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
            ->assertJsonPath('user.bio', null)
            ->assertJsonPath('user.image', null);

        expect($response->json('user.token'))->toBeString()->not->toBe('');
    });

    it('登録成功時に返したtokenをRealWorldのToken schemeで利用できる', function (): void {
        $response = $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ])->assertCreated();

        $this->withHeaders([
            'Authorization' => 'Token '.$response->json('user.token'),
        ])
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonFragment(['email' => 'jake@example.com']);
    });

    it('passwordを平文保存せずpassword_hashに保存する', function (): void {
        $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ])->assertCreated();

        $user = User::query()->where('email', 'jake@example.com')->firstOrFail();

        expect($user->password_hash)
            ->toBeString()
            ->not->toBe('secret')
            ->and(Hash::check('secret', $user->password_hash))->toBeTrue();
    });

    it('token発行に失敗した場合は登録Userをrollbackする', function (): void {
        $this->app->instance(AuthTokenIssuerInterface::class, new class implements AuthTokenIssuerInterface
        {
            public function issue(DomainUser $user): string
            {
                throw new RuntimeException('token issue failed');
            }
        });

        $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ])->assertInternalServerError();

        expect(User::query()->where('email', 'jake@example.com')->exists())->toBeFalse();
    });

    it('重複emailを422で拒否する', function (): void {
        User::factory()->create([
            'username' => 'existing',
            'email' => 'jake@example.com',
        ]);

        $response = $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('重複usernameを422で拒否する', function (): void {
        User::factory()->create([
            'username' => 'jake',
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson('/api/users', [
            'user' => [
                'username' => 'jake',
                'email' => 'jake@example.com',
                'password' => 'secret',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('validation failureを422のerrors.bodyで返す', function (): void {
        $response = $this->postJson('/api/users', [
            'user' => [
                'username' => '',
                'email' => 'not-an-email',
                'password' => 'short',
            ],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonStructure(['errors' => ['body']]);

        expect($response->json('errors.body'))->toBeArray()->not->toBeEmpty();
    });
});
