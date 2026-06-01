<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Application\Publishing\DTOs\UpdateArticleDto;
use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Domain\Publishing\Services\UniqueSlugGenerator;
use App\Domain\Publishing\ValueObjects\ArticleBody;
use App\Domain\Publishing\ValueObjects\ArticleDescription;
use App\Domain\Publishing\ValueObjects\ArticleTitle;
use Illuminate\Support\Facades\DB;

final readonly class UpdateArticleCommand
{
    public function __construct(
        private ArticleRepositoryInterface $articles,
        private UniqueSlugGenerator $slugs,
    ) {}

    /**
     * Article author が更新する本文情報を反映する。
     */
    public function execute(Article $article, UpdateArticleDto $dto): Article
    {
        $title = new ArticleTitle($dto->title ?? $article->title()->value);
        $description = new ArticleDescription($dto->description ?? $article->description()->value);
        $body = new ArticleBody($dto->body ?? $article->body()->value);
        $id = $article->id();

        $slug = $article->slug();

        if ($id !== null && $title->value !== $article->title()->value) {
            $slug = $this->slugs->generate($title, $id);
        }

        $updated = $article->withUpdatedContent(
            slug: $slug,
            title: $title,
            description: $description,
            body: $body,
        );

        return DB::transaction(fn (): Article => $this->articles->update($updated));
    }
}
