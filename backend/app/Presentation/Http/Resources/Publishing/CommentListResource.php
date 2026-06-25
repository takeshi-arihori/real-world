<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use App\Application\Publishing\DTOs\CommentListDto;
use App\Application\Publishing\DTOs\CommentViewDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommentListDto
 */
final class CommentListResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld multiple comments wrapper へ変換する。
     *
     * @return array{comments: list<array<string, mixed>>}
     */
    public function toArray(Request $request): array
    {
        /** @var CommentListDto $commentList */
        $commentList = $this->resource;

        return [
            'comments' => array_map(
                fn (CommentViewDto $comment): array => (new CommentResource($comment))->toArray($request),
                $commentList->comments,
            ),
        ];
    }
}
