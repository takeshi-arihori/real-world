<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

describe('Profile and Follow API', function (): void {
    it('公開profileをRealWorld profile wrapperで返す', function (): void {
        User::factory()->create([
            'username' => 'jake',
            'bio' => 'I like APIs',
            'image' => 'https://example.com/avatar.png',
        ]);

        $this->getJson('/api/profiles/jake')
            ->assertOk()
            ->assertExactJson([
                'profile' => [
                    'username' => 'jake',
                    'bio' => 'I like APIs',
                    'image' => 'https://example.com/avatar.png',
                    'following' => false,
                ],
            ]);
    });

    it('認証済みUser視点でprofile followingを算出する', function (): void {
        $viewer = User::factory()->create(['username' => 'viewer']);
        $target = User::factory()->create(['username' => 'jake']);
        profileApiFollow($viewer, $target);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->getJson('/api/profiles/jake')
            ->assertOk()
            ->assertJsonPath('profile.following', true);
    });

    it('存在しないprofileは404のerrors.bodyを返す', function (): void {
        $this->getJson('/api/profiles/missing')
            ->assertNotFound()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('未認証followを401で拒否する', function (): void {
        User::factory()->create(['username' => 'jake']);

        $this->postJson('/api/profiles/jake/follow')
            ->assertUnauthorized()
            ->assertJsonStructure(['errors' => ['body']]);
    });

    it('target Userをfollowしてprofile wrapperを返す', function (): void {
        $viewer = User::factory()->create(['username' => 'viewer']);
        User::factory()->create([
            'username' => 'jake',
            'bio' => null,
            'image' => null,
        ]);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->postJson('/api/profiles/jake/follow')
            ->assertOk()
            ->assertExactJson([
                'profile' => [
                    'username' => 'jake',
                    'bio' => null,
                    'image' => null,
                    'following' => true,
                ],
            ]);

        expect(DB::table('follows')->count())->toBe(1);
    });

    it('self-followを422で拒否する', function (): void {
        $viewer = User::factory()->create(['username' => 'jake']);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->postJson('/api/profiles/jake/follow')
            ->assertUnprocessable()
            ->assertExactJson([
                'errors' => [
                    'body' => ['cannot follow yourself'],
                ],
            ]);

        expect(DB::table('follows')->count())->toBe(0);
    });

    it('unfollowは未follow状態でもidempotentにprofile wrapperを返す', function (): void {
        $viewer = User::factory()->create(['username' => 'viewer']);
        User::factory()->create(['username' => 'jake']);

        $this->withRealWorldToken($this->issueRealWorldTokenFor($viewer))
            ->deleteJson('/api/profiles/jake/follow')
            ->assertOk()
            ->assertJsonPath('profile.following', false);

        expect(DB::table('follows')->count())->toBe(0);
    });
});

function profileApiFollow(User $follower, User $followee): void
{
    DB::table('follows')->insert([
        'follower_user_id' => $follower->getKey(),
        'followee_user_id' => $followee->getKey(),
        'created_at' => Carbon::parse('2026-05-04 00:00:00'),
        'updated_at' => Carbon::parse('2026-05-04 00:00:00'),
    ]);
}
