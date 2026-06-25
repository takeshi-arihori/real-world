<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use App\Application\Publishing\DTOs\ArticleListDto;
use App\Application\Publishing\DTOs\ArticleViewDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ArticleListDto
 */
final class ArticleListResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld multiple articles wrapper へ変換する。
     *
     * @return array{articles: list<array<string, mixed>>, articlesCount: int}
     */
    public function toArray(Request $request): array
    {
        /** @var ArticleListDto $articleList */
        $articleList = $this->resource;

        return [
            'articles' => array_map(
                fn (ArticleViewDto $article): array => (new ArticleResource($article, includeBody: false))->toArray($request),
                $articleList->articles,
            ),
            'articlesCount' => $articleList->articlesCount,
        ];
    }
}
