<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property string $name
 */
class Tag extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
    ];

    /**
     * Tag が付与された Article を返す。
     *
     * @return BelongsToMany<Article, $this>
     */
    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_tag')
            ->withTimestamps();
    }
}
