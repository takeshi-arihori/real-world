<?php

declare(strict_types=1);

namespace App\Application\Publishing\Commands;

use App\Domain\Publishing\Entities\Article;
use App\Domain\Publishing\Repositories\ArticleRepositoryInterface;
use Illuminate\Support\Facades\DB;

final readonly class DeleteArticleCommand
{
    public function __construct(private ArticleRepositoryInterface $articles) {}

    /**
     * Article を削除する。
     */
    public function execute(Article $article): void
    {
        DB::transaction(function () use ($article): void {
            $this->articles->delete($article);
        });
    }
}
