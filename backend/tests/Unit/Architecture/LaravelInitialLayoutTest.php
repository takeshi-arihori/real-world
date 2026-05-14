<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tests\TestCase;

uses(TestCase::class);

describe('Laravel初期DDD配置', function (): void {
    it('User EloquentモデルをInfrastructure永続化層に配置する', function (): void {
        expect(class_exists(User::class))->toBeTrue()
            ->and(new User)->toBeInstanceOf(Authenticatable::class)
            ->and(class_exists('App\\Models\\User'))->toBeFalse();
    });

    it('auth providerがInfrastructureのUserモデルを参照する', function (): void {
        expect(config('auth.providers.users.model'))->toBe(User::class);
    });

    it('User factoryがInfrastructureのUserモデルを生成する', function (): void {
        expect(User::factory()->make())->toBeInstanceOf(User::class);
    });

    it('HTTP presentationクラスをLaravel標準のapp/Http namespaceに残さない', function (): void {
        expect(class_exists('App\\Presentation\\Http\\Controllers\\Controller'))->toBeTrue()
            ->and(class_exists('App\\Http\\Controllers\\Controller'))->toBeFalse()
            ->and(phpFilesUnder(app_path('Http')))->toBe([]);
    });

    it('AppServiceProviderをLaravel bootstrap用の薄いproviderとして維持する', function (): void {
        $contents = file_get_contents(app_path('Providers/AppServiceProvider.php'));

        expect($contents)
            ->not->toContain('UserRepositoryInterface')
            ->not->toContain('EloquentUserRepository')
            ->not->toContain('$this->app->bind');
    });
});

/**
 * @return list<string>
 */
function phpFilesUnder(string $path): array
{
    if (! is_dir($path)) {
        return [];
    }

    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)
    );

    $phpFiles = [];

    foreach ($files as $file) {
        if (! $file instanceof SplFileInfo || $file->getExtension() !== 'php') {
            continue;
        }

        $phpFiles[] = $file->getPathname();
    }

    sort($phpFiles);

    return $phpFiles;
}
