<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Publishing;

use App\Application\Publishing\DTOs\ListFeedDto;
use Illuminate\Foundation\Http\FormRequest;

final class ListFeedRequest extends FormRequest
{
    /**
     * Feed は auth:api middleware で認証済み User のみ許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Feed query parameters を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'limit' => ['sometimes', 'integer', 'min:1'],
            'offset' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    /**
     * 検証済み query parameters を Application DTO へ変換する。
     */
    public function toDto(): ListFeedDto
    {
        /** @var array{limit?: int|string, offset?: int|string} $payload */
        $payload = $this->validated();

        return new ListFeedDto(
            limit: isset($payload['limit']) ? (int) $payload['limit'] : 20,
            offset: isset($payload['offset']) ? (int) $payload['offset'] : 0,
        );
    }
}
