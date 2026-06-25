<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Social;

use App\Application\Social\Commands\FollowUserCommand;
use App\Application\Social\Commands\UnfollowUserCommand;
use App\Application\Social\Queries\GetProfileQuery;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Resources\Social\ProfileResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class ProfileController extends Controller
{
    /**
     * 公開 Profile を RealWorld profile wrapper で返す。
     */
    public function show(Request $request, string $username, GetProfileQuery $query): JsonResponse
    {
        return (new ProfileResource($query->execute(
            username: $username,
            currentUserId: $this->optionalAuthenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * 認証済み User が target User を follow する。
     */
    public function follow(
        Request $request,
        string $username,
        FollowUserCommand $command,
        GetProfileQuery $query,
    ): JsonResponse {
        $currentUserId = $this->authenticatedUserId($request);
        $command->execute($currentUserId, $username);

        return (new ProfileResource($query->execute($username, $currentUserId)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * 認証済み User が target User の follow を解除する。
     */
    public function unfollow(
        Request $request,
        string $username,
        UnfollowUserCommand $command,
        GetProfileQuery $query,
    ): JsonResponse {
        $currentUserId = $this->authenticatedUserId($request);
        $command->execute($currentUserId, $username);

        return (new ProfileResource($query->execute($username, $currentUserId)))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * 認証必須 endpoint の認証済み User ID を取得する。
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
     * Optional auth endpoint で JWT があれば認証済み User ID を取得する。
     */
    private function optionalAuthenticatedUserId(Request $request): ?int
    {
        if ($request->headers->get('Authorization') === null) {
            return null;
        }

        $user = Auth::guard('api')->user();
        $userId = $user?->getAuthIdentifier();

        if (! is_numeric($userId)) {
            throw new AuthenticationException;
        }

        return (int) $userId;
    }
}
