<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Publishing;

use App\Application\Publishing\DTOs\UpdateArticleDto;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateArticleRequest extends FormRequest
{
    /**
     * 認可は Controller から ArticlePolicy へ委譲する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld update article request の nested article payload を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'article' => ['required', 'array'],
            'article.title' => ['sometimes', 'filled', 'string', 'max:255'],
            'article.description' => ['sometimes', 'filled', 'string', 'max:255'],
            'article.body' => ['sometimes', 'filled', 'string'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): UpdateArticleDto
    {
        /** @var array{article: array{title?: string, description?: string, body?: string}} $payload */
        $payload = $this->validated();

        return new UpdateArticleDto(
            title: $payload['article']['title'] ?? null,
            description: $payload['article']['description'] ?? null,
            body: $payload['article']['body'] ?? null,
        );
    }
}
