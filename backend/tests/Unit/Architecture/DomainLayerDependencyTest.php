<?php

declare(strict_types=1);

use Tests\TestCase;

uses(TestCase::class);

describe('Domain layer dependencies', function (): void {
    it('Domain層がLaravelや外側レイヤーに依存しない', function (): void {
        $domainPath = app_path('Domain');

        expect($domainPath)->toBeDirectory();

        $forbiddenDependencies = [
            'Illuminate\\',
            'App\\Models\\',
            'App\\Infrastructure\\',
            'App\\Presentation\\',
            'App\\Http\\',
        ];

        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($domainPath, FilesystemIterator::SKIP_DOTS)
        );

        foreach ($files as $file) {
            if (! $file instanceof SplFileInfo || $file->getExtension() !== 'php') {
                continue;
            }

            $contents = file_get_contents($file->getPathname());

            foreach ($forbiddenDependencies as $dependency) {
                expect($contents)
                    ->not
                    ->toContain($dependency, "{$file->getPathname()} must not depend on {$dependency}");
            }
        }
    });
});
