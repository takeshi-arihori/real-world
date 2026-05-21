<?php

declare(strict_types=1);

namespace App\Presentation\Http\Requests\Identity;

use App\Application\Identity\DTOs\UpdateCurrentUserDto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCurrentUserRequest extends FormRequest
{
    /**
     * 認証済み User が自身の情報を更新するリクエストとして許可する。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * RealWorld update user request の nested user payload を検証する。
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $userId = $this->user()?->getAuthIdentifier();

        return [
            'user' => ['required', 'array'],
            'user.email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'user.username' => ['sometimes', 'string', 'max:50', Rule::unique('users', 'username')->ignore($userId)],
            'user.password' => ['sometimes', 'string', 'min:6'],
            'user.bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'user.image' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * 検証済み payload を Application DTO へ変換する。
     */
    public function toDto(): UpdateCurrentUserDto
    {
        /** @var array{user: array{email?: string, username?: string, password?: string, bio?: string|null, image?: string|null}} $payload */
        $payload = $this->validated();
        $user = $payload['user'];

        return new UpdateCurrentUserDto(
            email: $user['email'] ?? null,
            username: $user['username'] ?? null,
            password: $user['password'] ?? null,
            hasBio: array_key_exists('bio', $user),
            bio: $user['bio'] ?? null,
            hasImage: array_key_exists('image', $user),
            image: $user['image'] ?? null,
        );
    }
}
