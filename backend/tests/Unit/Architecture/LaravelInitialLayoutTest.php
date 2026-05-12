<?php

declare(strict_types=1);

use App\Infrastructure\Persistence\Models\User;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tests\TestCase;

uses(TestCase::class);

describe('Laravel initial DDD layout', function (): void {
    it('User Eloquent model is placed under Infrastructure persistence', function (): void {
        expect(class_exists(User::class))->toBeTrue()
            ->and(new User)->toBeInstanceOf(Authenticatable::class)
            ->and(class_exists('App\\Models\\User'))->toBeFalse();
    });

    it('auth provider resolves the Infrastructure User model', function (): void {
        expect(config('auth.providers.users.model'))->toBe(User::class);
    });

    it('User factory creates the Infrastructure User model', function (): void {
        expect(User::factory()->make())->toBeInstanceOf(User::class);
    });

    it('HTTP presentation classes do not remain in Laravel default app/Http namespace', function (): void {
        expect(class_exists('App\\Presentation\\Http\\Controllers\\Controller'))->toBeTrue()
            ->and(class_exists('App\\Http\\Controllers\\Controller'))->toBeFalse()
            ->and(phpFilesUnder(app_path('Http')))->toBe([]);
    });

    it('keeps AppServiceProvider as a thin Laravel bootstrap provider', function (): void {
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
