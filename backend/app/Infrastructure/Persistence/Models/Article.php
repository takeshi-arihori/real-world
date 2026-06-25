<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $author_user_id
 * @property string $slug
 * @property string $title
 * @property string $description
 * @property string $body
 */
class Article extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'author_user_id',
        'slug',
        'title',
        'description',
        'body',
    ];

    /**
     * Article author の User を返す。
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    /**
     * Article に付与された Tag を返す。
     *
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'article_tag')
            ->withTimestamps()
            ->orderBy('article_tag.id');
    }

    /**
     * Article を favorite した User を返す。
     *
     * @return BelongsToMany<User, $this>
     */
    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites', 'article_id', 'user_id')
            ->withTimestamps();
    }
}
