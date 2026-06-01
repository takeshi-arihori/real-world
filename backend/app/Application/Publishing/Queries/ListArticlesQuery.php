<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\ArticleListDto;
use App\Application\Publishing\DTOs\ListArticlesDto;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use Illuminate\Database\Eloquent\Builder;

final readonly class ListArticlesQuery
{
    public function __construct(private ArticleViewFactory $articles) {}

    /**
     * Article 一覧を filter / pagination つきで取得する。
     */
    public function execute(ListArticlesDto $dto, ?int $currentUserId): ArticleListDto
    {
        $query = ArticleModel::query()
            ->with(['author', 'tags']);

        if ($dto->tag !== null) {
            $query->whereHas('tags', function (Builder $query) use ($dto): void {
                $query->where('name', $dto->tag);
            });
        }

        if ($dto->author !== null) {
            $query->whereHas('author', function (Builder $query) use ($dto): void {
                $query->where('username', $dto->author);
            });
        }

        if ($dto->favorited !== null) {
            $query->whereHas('favoritedBy', function (Builder $query) use ($dto): void {
                $query->where('username', $dto->favorited);
            });
        }

        $articlesCount = (clone $query)->count();
        $models = $query
            ->orderByDesc('created_at')
            ->offset($dto->offset)
            ->limit($dto->limit)
            ->get();

        return new ArticleListDto(
            articles: $this->articles->fromModels($models, $currentUserId),
            articlesCount: $articlesCount,
        );
    }
}
