<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Application\Publishing\DTOs\CommentAuthorDto;
use App\Application\Publishing\DTOs\CommentViewDto;
use App\Infrastructure\Persistence\Models\Comment as CommentModel;
use App\Infrastructure\Persistence\Models\User as UserModel;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class CommentViewFactory
{
    /**
     * Comment Eloquent model 群を RealWorld response 用 DTO へ変換する。
     *
     * @param  Collection<int, CommentModel>  $models
     * @return list<CommentViewDto>
     */
    public function fromModels(Collection $models, ?int $currentUserId): array
    {
        if ($models->isEmpty()) {
            return [];
        }

        $models->each(fn (CommentModel $model): CommentModel => $model->loadMissing('author'));
        $authorUserIds = $models->map(fn (CommentModel $model): int => $model->author_user_id)->unique()->all();
        $followingUserIds = $this->followingUserIds($authorUserIds, $currentUserId);

        return $models
            ->map(fn (CommentModel $model): CommentViewDto => $this->buildDto($model, $followingUserIds))
            ->values()
            ->all();
    }

    /**
     * 1件の Comment Eloquent model を RealWorld response 用 DTO へ変換する。
     */
    public function fromModel(CommentModel $model, ?int $currentUserId): CommentViewDto
    {
        return $this->fromModels(collect([$model]), $currentUserId)[0];
    }

    /**
     * @param  list<int>  $followingUserIds
     */
    private function buildDto(CommentModel $model, array $followingUserIds): CommentViewDto
    {
        /** @var UserModel $author */
        $author = $model->author;

        return new CommentViewDto(
            id: (int) $model->getKey(),
            createdAt: $this->formatTimestamp($model->created_at),
            updatedAt: $this->formatTimestamp($model->updated_at),
            body: $model->body,
            author: new CommentAuthorDto(
                username: $author->username,
                bio: $author->bio,
                image: $author->image,
                following: in_array($model->author_user_id, $followingUserIds, true),
            ),
        );
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
