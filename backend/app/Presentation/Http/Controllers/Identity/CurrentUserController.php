<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Identity;

use App\Application\Identity\Commands\UpdateCurrentUserCommand;
use App\Application\Identity\DTOs\AuthenticatedUserDto;
use App\Application\Identity\Queries\GetCurrentUserQuery;
use App\Domain\Identity\Entities\User;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Requests\Identity\UpdateCurrentUserRequest;
use App\Presentation\Http\Resources\Identity\UserResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CurrentUserController extends Controller
{
    /**
     * 現在 User を RealWorld user wrapper で返す。
     */
    public function show(Request $request, GetCurrentUserQuery $query): JsonResponse
    {
        return $this->userResponse(
            request: $request,
            user: $query->execute($this->authenticatedUserId($request)),
        );
    }

    /**
     * 現在 User を更新し、更新後の User を RealWorld user wrapper で返す。
     */
    public function update(UpdateCurrentUserRequest $request, UpdateCurrentUserCommand $command): JsonResponse
    {
        return $this->userResponse(
            request: $request,
            user: $command->execute($this->authenticatedUserId($request), $request->toDto()),
        );
    }

    /**
     * 認証済み User の ID を取得する。
     */
    private function authenticatedUserId(Request $request): int
    {
        $userId = $request->user()?->getAuthIdentifier();

        if (! is_numeric($userId)) {
            throw new AuthenticationException;
        }

        return (int) $userId;
    }

    /**
     * 現在の bearer token を含む RealWorld user response を生成する。
     */
    private function userResponse(Request $request, User $user): JsonResponse
    {
        $token = $request->bearerToken();

        if ($token === null || $token === '') {
            throw new AuthenticationException;
        }

        return (new UserResource(new AuthenticatedUserDto(
            user: $user,
            token: $token,
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
