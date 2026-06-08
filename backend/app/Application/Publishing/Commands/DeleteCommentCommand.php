<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Domain\Publishing\Entities\Comment;
use Illuminate\Support\Facades\DB;

final readonly class DeleteCommentCommand
{
    /**
     * Comment を削除する。
     */
    public function execute(Comment $comment): void
    {
        $commentId = $comment->id();

        if ($commentId === null) {
            return;
        }

        DB::transaction(function () use ($commentId): void {
            DB::table('comments')->where('id', $commentId->value)->delete();
        });
    }
}
