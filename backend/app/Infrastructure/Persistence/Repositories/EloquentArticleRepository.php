<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use App\Domain\Publishing\ValueObjects\ArticleBody;
use App\Domain\Publishing\ValueObjects\ArticleDescription;
use App\Domain\Publishing\ValueObjects\ArticleId;
use App\Domain\Publishing\ValueObjects\ArticleTitle;
use App\Domain\Publishing\ValueObjects\Slug;
use App\Domain\Publishing\ValueObjects\TagName;
use App\Infrastructure\Persistence\Models\Article as ArticleModel;
use App\Infrastructure\Persistence\Models\Tag as TagModel;
use InvalidArgumentException;

final class EloquentArticleRepository implements ArticleRepositoryInterface
{
    /**
     * slug に一致する Article を取得する。
     */
    public function findBySlug(Slug $slug): ?Article
    {
        $model = ArticleModel::query()
            ->with('tags')
            ->where('slug', $slug->value)
            ->first();

        return $model instanceof ArticleModel ? $this->toEntity($model) : null;
    }

    /**
     * slug が既存 Article で使用済みか確認する。
     */
    public function slugExists(Slug $slug): bool
    {
        return ArticleModel::query()
            ->where('slug', $slug->value)
            ->exists();
    }

    /**
     * 指定 Article を除き、slug が既存 Article で使用済みか確認する。
     */
    public function slugExistsExceptArticle(Slug $slug, ArticleId $exceptArticleId): bool
    {
        return ArticleModel::query()
            ->where('slug', $slug->value)
            ->whereKeyNot($exceptArticleId->value)
            ->exists();
    }

    /**
     * Article を永続化し、採番済み ID を含む Entity を返す。
     */
    public function save(Article $article): Article
    {
        $model = new ArticleModel;
        $this->fillModel($model, $article);
        $model->save();
        $this->syncTags($model, $article->tags());

        return $this->toEntity($model->load('tags'));
    }

    /**
     * 既存 Article を更新し、更新後の Entity を返す。
     */
    public function update(Article $article): Article
    {
        $id = $article->id();

        if ($id === null) {
            throw new InvalidArgumentException('Cannot update an unsaved article.');
        }

        $model = ArticleModel::query()->findOrFail($id->value);
        $this->fillModel($model, $article);
        $model->save();
        $this->syncTags($model, $article->tags());

        return $this->toEntity($model->load('tags'));
    }

    /**
     * Article を削除する。
     */
    public function delete(Article $article): void
    {
        $id = $article->id();

        if ($id === null) {
            throw new InvalidArgumentException('Cannot delete an unsaved article.');
        }

        ArticleModel::query()->whereKey($id->value)->delete();
    }

    /**
     * Domain Entity の値を Eloquent model へ反映する。
     */
    private function fillModel(ArticleModel $model, Article $article): void
    {
        $model->fill([
            'author_user_id' => $article->authorUserId(),
            'slug' => $article->slug()->value,
            'title' => $article->title()->value,
            'description' => $article->description()->value,
            'body' => $article->body()->value,
        ]);
    }

    /**
     * Article に紐付く Tag を同期する。
     *
     * @param  list<TagName>  $tags
     */
    private function syncTags(ArticleModel $model, array $tags): void
    {
        $tagIds = [];

        foreach ($tags as $tag) {
            $tagIds[] = TagModel::query()->firstOrCreate(['name' => $tag->value])->getKey();
        }

        $model->tags()->sync($tagIds);
    }

    /**
     * 永続化モデルを Domain Entity へ変換する。
     */
    private function toEntity(ArticleModel $model): Article
    {
        $model->loadMissing('tags');

        return new Article(
            id: new ArticleId((int) $model->getKey()),
            authorUserId: $model->author_user_id,
            slug: new Slug($model->slug),
            title: new ArticleTitle($model->title),
            description: new ArticleDescription($model->description),
            body: new ArticleBody($model->body),
            tags: $model->tags
                ->map(fn (TagModel $tag): TagName => new TagName($tag->name))
                ->values()
                ->all(),
        );
    }
}
