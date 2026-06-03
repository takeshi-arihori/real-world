<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Domain\Publishing\ValueObjects\Slug;

final readonly class GetArticleForAuthorizationQuery
{
    public function __construct(private ArticleRepositoryInterface $articles) {}

    /**
     * 認可判定用に slug に一致する Article Entity を取得する。
     */
    public function execute(string $slug): Article
    {
        $article = $this->articles->findBySlug(new Slug($slug));

        if ($article === null) {
            throw ArticleNotFoundException::forSlug($slug);
        }

        return $article;
    }
}
