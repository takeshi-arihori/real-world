<?php

declare(strict_types=1);

namespace App\Application\Publishing\Queries;

use App\Infrastructure\Persistence\Models\Tag as TagModel;

final class ListTagsQuery
{
    /**
     * 登録済み Tag の distinct list を安定した順序で返す。
     *
     * @return list<string>
     */
    public function execute(): array
    {
        return TagModel::query()
            ->select('name')
            ->distinct()
            ->orderBy('name')
            ->pluck('name')
            ->map(fn (mixed $name): string => (string) $name)
            ->values()
            ->all();
    }
}
