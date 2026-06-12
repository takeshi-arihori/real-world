<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\ArticleListDto;
use App\Application\Publishing\DTOs\ListFeedDto;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use Illuminate\Database\Query\Builder;

final readonly class ListFeedQuery
{
    public function __construct(private ArticleViewFactory $articles) {}

    /**
     * 現在 User が follow している author の Article feed を取得する。
     */
    public function execute(ListFeedDto $dto, int $currentUserId): ArticleListDto
    {
        $query = ArticleModel::query()
            ->with(['author', 'tags'])
            ->whereIn('author_user_id', function (Builder $query) use ($currentUserId): void {
                $query->select('followee_user_id')
                    ->from('follows')
                    ->where('follower_user_id', $currentUserId);
            });

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
