<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Application\Publishing\DTOs\CreateArticleDto;
use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Domain\Publishing\Services\UniqueSlugGenerator;
use App\Domain\Publishing\ValueObjects\ArticleBody;
use App\Domain\Publishing\ValueObjects\ArticleDescription;
use App\Domain\Publishing\ValueObjects\ArticleTitle;
use App\Domain\Publishing\ValueObjects\TagName;
use Illuminate\Support\Facades\DB;

final readonly class CreateArticleCommand
{
    public function __construct(
        private ArticleRepositoryInterface $articles,
        private UniqueSlugGenerator $slugs,
    ) {}

    /**
     * Article を作成する。
     */
    public function execute(int $authorUserId, CreateArticleDto $dto): Article
    {
        $title = new ArticleTitle($dto->title);
        $article = Article::create(
            authorUserId: $authorUserId,
            slug: $this->slugs->generate($title),
            title: $title,
            description: new ArticleDescription($dto->description),
            body: new ArticleBody($dto->body),
            tags: array_map(
                fn (string $tagName): TagName => new TagName($tagName),
                $dto->tagList,
            ),
        );

        return DB::transaction(fn (): Article => $this->articles->save($article));
    }
}
