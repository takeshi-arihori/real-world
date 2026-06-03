<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use App\Application\Publishing\DTOs\ArticleViewDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ArticleViewDto
 */
final class ArticleResource extends JsonResource
{
    public static $wrap = null;

    public function __construct(mixed $resource, private readonly bool $includeBody = true)
    {
        parent::__construct($resource);
    }

    /**
     * RealWorld article object へ変換する。
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ArticleViewDto $article */
        $article = $this->resource;
        $payload = [
            'slug' => $article->slug,
            'title' => $article->title,
            'description' => $article->description,
            'tagList' => $article->tagList,
            'createdAt' => $article->createdAt,
            'updatedAt' => $article->updatedAt,
            'favorited' => $article->favorited,
            'favoritesCount' => $article->favoritesCount,
            'author' => [
                'username' => $article->author->username,
                'bio' => $article->author->bio,
                'image' => $article->author->image,
                'following' => $article->author->following,
            ],
        ];

        if ($this->includeBody) {
            $payload = [
                ...array_slice($payload, 0, 3, true),
                'body' => $article->body,
                ...array_slice($payload, 3, null, true),
            ];
        }

        return $payload;
    }
}
