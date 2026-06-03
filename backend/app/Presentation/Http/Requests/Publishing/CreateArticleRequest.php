<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Publishing;

use App\Application\Publishing\DTOs\CreateArticleDto;
use Illuminate\Foundation\Http\FormRequest;

final class CreateArticleRequest extends FormRequest
{
    /**
     * 認証済み User の Article 作成リクエストとして許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld create article request の nested article payload を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'article' => ['required', 'array'],
            'article.title' => ['required', 'string', 'max:255'],
            'article.description' => ['required', 'string', 'max:255'],
            'article.body' => ['required', 'string'],
            'article.tagList' => ['sometimes', 'array'],
            'article.tagList.*' => ['filled', 'string', 'max:50', 'distinct'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): CreateArticleDto
    {
        /** @var array{article: array{title: string, description: string, body: string, tagList?: list<string>}} $payload */
        $payload = $this->validated();

        return new CreateArticleDto(
            title: $payload['article']['title'],
            description: $payload['article']['description'],
            body: $payload['article']['body'],
            tagList: $payload['article']['tagList'] ?? [],
        );
    }
}
