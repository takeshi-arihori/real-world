<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use App\Application\Publishing\DTOs\CommentViewDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommentViewDto
 */
final class CommentResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld comment object へ変換する。
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CommentViewDto $comment */
        $comment = $this->resource;

        return [
            'id' => $comment->id,
            'createdAt' => $comment->createdAt,
            'updatedAt' => $comment->updatedAt,
            'body' => $comment->body,
            'author' => [
                'username' => $comment->author->username,
                'bio' => $comment->author->bio,
                'image' => $comment->author->image,
                'following' => $comment->author->following,
            ],
        ];
    }
}
