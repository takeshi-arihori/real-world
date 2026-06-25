<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\ArticleViewDto;
use App\Domain\Publishing\Exceptions\ArticleNotFoundException;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;

final readonly class GetArticleQuery
{
    public function __construct(private ArticleViewFactory $articles) {}

    /**
     * slug に一致する Article を response DTO として取得する。
     */
    public function execute(string $slug, ?int $currentUserId): ArticleViewDto
    {
        $model = ArticleModel::query()
            ->with(['author', 'tags'])
            ->where('slug', $slug)
            ->first();

        if (! $model instanceof ArticleModel) {
            throw ArticleNotFoundException::forSlug($slug);
        }

        return $this->articles->fromModel($model, $currentUserId);
    }
}
