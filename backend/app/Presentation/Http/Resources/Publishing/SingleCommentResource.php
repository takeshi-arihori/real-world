<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SingleCommentResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld single comment wrapper へ変換する。
     *
     * @return array{comment: array<string, mixed>}
     */
    public function toArray(Request $request): array
    {
        return [
            'comment' => (new CommentResource($this->resource))->toArray($request),
        ];
    }
}
