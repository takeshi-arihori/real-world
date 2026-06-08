<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Publishing;

use App\Application\Publishing\DTOs\CreateCommentDto;
use Illuminate\Foundation\Http\FormRequest;

final class CreateCommentRequest extends FormRequest
{
    /**
     * 認証済み User の Comment 投稿リクエストとして許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld add comment request の nested comment payload を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'comment' => ['required', 'array'],
            'comment.body' => ['required', 'string'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): CreateCommentDto
    {
        /** @var array{comment: array{body: string}} $payload */
        $payload = $this->validated();

        return new CreateCommentDto(body: $payload['comment']['body']);
    }
}
