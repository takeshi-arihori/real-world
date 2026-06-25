<?php

declare(strict_types=1);

namespace App\Presentation\Http\Resources\Publishing;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TagListResource extends JsonResource
{
    public static $wrap = null;

    /**
     * RealWorld tags wrapper へ変換する。
     *
     * @return array{tags: list<string>}
     */
    public function toArray(Request $request): array
    {
        /** @var list<string> $tags */
        $tags = $this->resource;

        return [
            'tags' => $tags,
        ];
    }
}
