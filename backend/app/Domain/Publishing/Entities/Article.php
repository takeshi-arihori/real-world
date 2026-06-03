<?php

declare(strict_types=1);

namespace App\Domain\Publishing\Entities;

use App\Domain\Publishing\ValueObjects\ArticleBody;
use App\Domain\Publishing\ValueObjects\ArticleDescription;
use App\Domain\Publishing\ValueObjects\ArticleId;
use App\Domain\Publishing\ValueObjects\ArticleTitle;
use App\Domain\Publishing\ValueObjects\Slug;
use App\Domain\Publishing\ValueObjects\TagName;
use InvalidArgumentException;

final readonly class Article
{
    /**
     * @param  list<TagName>  $tags
     */
    public function __construct(
        private ?ArticleId $id,
        private int $authorUserId,
        private Slug $slug,
        private ArticleTitle $title,
        private ArticleDescription $description,
        private ArticleBody $body,
        private array $tags,
    ) {
        if ($authorUserId < 1) {
            throw new InvalidArgumentException('Article author user id must be positive.');
        }
    }

    /**
     * 新規 Article を生成する。
     *
     * @param  list<TagName>  $tags
     */
    public static function create(
        int $authorUserId,
        Slug $slug,
        ArticleTitle $title,
        ArticleDescription $description,
        ArticleBody $body,
        array $tags,
    ): self {
        return new self(
            id: null,
            authorUserId: $authorUserId,
            slug: $slug,
            title: $title,
            description: $description,
            body: $body,
            tags: $tags,
        );
    }

    /**
     * 永続化後の ID を持つ Article として複製する。
     */
    public function withId(ArticleId $id): self
    {
        return new self(
            id: $id,
            authorUserId: $this->authorUserId,
            slug: $this->slug,
            title: $this->title,
            description: $this->description,
            body: $this->body,
            tags: $this->tags,
        );
    }

    /**
     * 更新後の本文情報を持つ Article として複製する。
     */
    public function withUpdatedContent(
        Slug $slug,
        ArticleTitle $title,
        ArticleDescription $description,
        ArticleBody $body,
    ): self {
        return new self(
            id: $this->id,
            authorUserId: $this->authorUserId,
            slug: $slug,
            title: $title,
            description: $description,
            body: $body,
            tags: $this->tags,
        );
    }

    public function id(): ?ArticleId
    {
        return $this->id;
    }

    public function authorUserId(): int
    {
        return $this->authorUserId;
    }

    public function slug(): Slug
    {
        return $this->slug;
    }

    public function title(): ArticleTitle
    {
        return $this->title;
    }

    public function description(): ArticleDescription
    {
        return $this->description;
    }

    public function body(): ArticleBody
    {
        return $this->body;
    }

    /**
     * @return list<TagName>
     */
    public function tags(): array
    {
        return $this->tags;
    }
}
