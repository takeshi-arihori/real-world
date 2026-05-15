<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Identity;

use App\Application\Identity\DTOs\RegisterUserDto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class RegisterUserRequest extends FormRequest
{
    /**
     * ゲストが実行できる登録リクエストとして許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld register request の nested user payload を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'user' => ['required', 'array'],
            'user.username' => ['required', 'string', 'max:50', Rule::unique('users', 'username')],
            'user.email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'user.password' => ['required', 'string', 'min:6'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): RegisterUserDto
    {
        /** @var array{user: array{username: string, email: string, password: string}} $payload */
        $payload = $this->validated();

        return new RegisterUserDto(
            username: $payload['user']['username'],
            email: $payload['user']['email'],
            password: $payload['user']['password'],
        );
    }
}
