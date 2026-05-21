<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Identity;

use App\Application\Identity\DTOs\LoginUserDto;
use Illuminate\Foundation\Http\FormRequest;

final class LoginUserRequest extends FormRequest
{
    /**
     * ゲストが実行できるログインリクエストとして許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld login request の nested user payload を検証する。
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'user' => ['required', 'array'],
            'user.email' => ['required', 'email'],
            'user.password' => ['required', 'string'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): LoginUserDto
    {
        /** @var array{user: array{email: string, password: string}} $payload */
        $payload = $this->validated();

        return new LoginUserDto(
            email: $payload['user']['email'],
            password: $payload['user']['password'],
        );
    }
}
