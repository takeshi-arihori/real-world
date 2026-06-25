<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Publishing;

use App\Application\Publishing\DTOs\ListArticlesDto;
use Illuminate\Foundation\Http\FormRequest;

final class ListArticlesRequest extends FormRequest
{
    /**
     * Article 一覧はゲストにも公開する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Article list query parameters を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'tag' => ['sometimes', 'string'],
            'author' => ['sometimes', 'string'],
            'favorited' => ['sometimes', 'string'],
            'limit' => ['sometimes', 'integer', 'min:1'],
            'offset' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    /**
     * 検証済み query parameters を Application DTO へ変換する。
     */
    public function toDto(): ListArticlesDto
    {
        /** @var array{tag?: string, author?: string, favorited?: string, limit?: int|string, offset?: int|string} $payload */
        $payload = $this->validated();

        return new ListArticlesDto(
            tag: $payload['tag'] ?? null,
            author: $payload['author'] ?? null,
            favorited: $payload['favorited'] ?? null,
            limit: isset($payload['limit']) ? (int) $payload['limit'] : 20,
            offset: isset($payload['offset']) ? (int) $payload['offset'] : 0,
        );
    }
}
