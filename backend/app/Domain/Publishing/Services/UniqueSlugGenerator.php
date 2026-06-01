<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Services;

use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Domain\Publishing\ValueObjects\ArticleId;
use App\Domain\Publishing\ValueObjects\ArticleTitle;
use App\Domain\Publishing\ValueObjects\Slug;

final readonly class UniqueSlugGenerator
{
    public function __construct(private ArticleRepositoryInterface $articles) {}

    /**
     * title から一意な Article slug を生成する。
     */
    public function generate(ArticleTitle $title, ?ArticleId $exceptArticleId = null): Slug
    {
        $base = $this->baseSlug($title->value);
        $candidate = new Slug($base);
        $suffix = 2;

        while ($this->exists($candidate, $exceptArticleId)) {
            $candidate = new Slug($base.'-'.$suffix);
            $suffix++;
        }

        return $candidate;
    }

    /**
     * slug 候補が衝突しているか確認する。
     */
    private function exists(Slug $slug, ?ArticleId $exceptArticleId): bool
    {
        if ($exceptArticleId === null) {
            return $this->articles->slugExists($slug);
        }

        return $this->articles->slugExistsExceptArticle($slug, $exceptArticleId);
    }

    /**
     * title を URL safe な slug base へ変換する。
     */
    private function baseSlug(string $title): string
    {
        $slug = strtolower(trim($title));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug === '' ? 'article' : $slug;
    }
}
