<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Repositories;

use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\ValueObjects\ArticleId;
use App\Domain\Publishing\ValueObjects\Slug;

interface ArticleRepositoryInterface
{
    /**
     * slug に一致する Article を取得する。
     */
    public function findBySlug(Slug $slug): ?Article;

    /**
     * slug が既存 Article で使用済みか確認する。
     */
    public function slugExists(Slug $slug): bool;

    /**
     * 指定 Article を除き、slug が既存 Article で使用済みか確認する。
     */
    public function slugExistsExceptArticle(Slug $slug, ArticleId $exceptArticleId): bool;

    /**
     * Article を永続化し、採番済み ID を含む Entity を返す。
     */
    public function save(Article $article): Article;

    /**
     * 既存 Article を更新し、更新後の Entity を返す。
     */
    public function update(Article $article): Article;

    /**
     * Article を削除する。
     */
    public function delete(Article $article): void;
}
