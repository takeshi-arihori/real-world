<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use App\Application\Publishing\DTOs\ArticleViewDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ArticleViewDto
 */
final class SingleArticleResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld single article wrapper へ変換する。
     *
     * @return array{article: array<string, mixed>}
     */
    public function toArray(Request $request): array
    {
        return [
            'article' => (new ArticleResource($this->resource))->toArray($request),
        ];
    }
}
