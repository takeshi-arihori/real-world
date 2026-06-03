<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\ArticleAuthorDto;
use App\Application\Publishing\DTOs\ArticleViewDto;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use App\Infrastructure\Persistence\Models\Tag as TagModel;
use App\Infrastructure\Persistence\Models\User as UserModel;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ArticleViewFactory
{
    /**
     * Article Eloquent model 群を RealWorld response 用 DTO へ変換する。
     *
     * @param  Collection<int, ArticleModel>  $models
     * @return list<ArticleViewDto>
     */
    public function fromModels(Collection $models, ?int $currentUserId): array
    {
        if ($models->isEmpty()) {
            return [];
        }

        $models->each(fn (ArticleModel $model): ArticleModel => $model->loadMissing(['author', 'tags']));
        $articleIds = $models->map(fn (ArticleModel $model): int => (int) $model->getKey())->all();
        $authorUserIds = $models->map(fn (ArticleModel $model): int => $model->author_user_id)->unique()->all();
        $favoritesCounts = $this->favoritesCounts($articleIds);
        $favoritedArticleIds = $this->favoritedArticleIds($articleIds, $currentUserId);
        $followingUserIds = $this->followingUserIds($authorUserIds, $currentUserId);

        return $models
            ->map(fn (ArticleModel $model): ArticleViewDto => $this->buildDto(
                model: $model,
                favoritesCounts: $favoritesCounts,
                favoritedArticleIds: $favoritedArticleIds,
                followingUserIds: $followingUserIds,
            ))
            ->values()
            ->all();
    }

    /**
     * 1件の Article Eloquent model を RealWorld response 用 DTO へ変換する。
     */
    public function fromModel(ArticleModel $model, ?int $currentUserId): ArticleViewDto
    {
        return $this->fromModels(collect([$model]), $currentUserId)[0];
    }

    /**
     * @param  array<int, int>  $favoritesCounts
     * @param  list<int>  $favoritedArticleIds
     * @param  list<int>  $followingUserIds
     */
    private function buildDto(
        ArticleModel $model,
        array $favoritesCounts,
        array $favoritedArticleIds,
        array $followingUserIds,
    ): ArticleViewDto {
        /** @var UserModel $author */
        $author = $model->author;

        return new ArticleViewDto(
            slug: $model->slug,
            title: $model->title,
            description: $model->description,
            body: $model->body,
            tagList: $model->tags
                ->map(fn (TagModel $tag): string => $tag->name)
                ->values()
                ->all(),
            createdAt: $this->formatTimestamp($model->created_at),
            updatedAt: $this->formatTimestamp($model->updated_at),
            favorited: in_array((int) $model->getKey(), $favoritedArticleIds, true),
            favoritesCount: $favoritesCounts[(int) $model->getKey()] ?? 0,
            author: new ArticleAuthorDto(
                username: $author->username,
                bio: $author->bio,
                image: $author->image,
                following: in_array($model->author_user_id, $followingUserIds, true),
            ),
        );
    }

    /**
     * @param  list<int>  $articleIds
     * @return array<int, int>
     */
    private function favoritesCounts(array $articleIds): array
    {
        /** @var array<int, int> $counts */
        $counts = DB::table('favorites')
            ->select('article_id', DB::raw('count(*) as aggregate'))
            ->whereIn('article_id', $articleIds)
            ->groupBy('article_id')
            ->pluck('aggregate', 'article_id')
            ->map(fn (mixed $count): int => (int) $count)
            ->all();

        return $counts;
    }

    /**
     * @param  list<int>  $articleIds
     * @return list<int>
     */
    private function favoritedArticleIds(array $articleIds, ?int $currentUserId): array
    {
        if ($currentUserId === null) {
            return [];
        }

        return DB::table('favorites')
            ->where('user_id', $currentUserId)
            ->whereIn('article_id', $articleIds)
            ->pluck('article_id')
            ->map(fn (mixed $articleId): int => (int) $articleId)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $authorUserIds
     * @return list<int>
     */
    private function followingUserIds(array $authorUserIds, ?int $currentUserId): array
    {
        if ($currentUserId === null) {
            return [];
        }

        return DB::table('follows')
            ->where('follower_user_id', $currentUserId)
            ->whereIn('followee_user_id', $authorUserIds)
            ->pluck('followee_user_id')
            ->map(fn (mixed $userId): int => (int) $userId)
            ->values()
            ->all();
    }

    /**
     * RealWorld API の timestamp 形式へ変換する。
     */
    private function formatTimestamp(DateTimeInterface|string|null $value): string
    {
        return Carbon::parse($value)->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
