<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Publishing;

use App\Application\Publishing\Commands\AddCommentCommand;
use App\Application\Publishing\Commands\DeleteCommentCommand;
use App\Application\Publishing\Queries\GetCommentForAuthorizationQuery;
use App\Application\Publishing\Queries\GetCommentQuery;
use App\Application\Publishing\Queries\ListCommentsQuery;
use App\Domain\Publishing\Exceptions\CommentNotFoundException;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Requests\Publishing\CreateCommentRequest;
use App\Presentation\Http\Resources\Publishing\CommentListResource;
use App\Presentation\Http\Resources\Publishing\SingleCommentResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

final class CommentController extends Controller
{
    /**
     * Article の Comment 一覧を RealWorld comments wrapper で返す。
     */
    public function index(Request $request, string $slug, ListCommentsQuery $query): JsonResponse
    {
        return (new CommentListResource($query->execute(
            slug: $slug,
            currentUserId: $this->optionalAuthenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * 認証済み User が Article へ Comment を投稿する。
     */
    public function store(
        CreateCommentRequest $request,
        string $slug,
        AddCommentCommand $command,
        GetCommentQuery $query,
    ): JsonResponse {
        $currentUserId = $this->authenticatedUserId($request);
        $comment = $command->execute(
            authorUserId: $currentUserId,
            slug: $slug,
            dto: $request->toDto(),
        );
        $commentId = $comment->id();

        if ($commentId === null) {
            throw CommentNotFoundException::forId(0);
        }

        return (new SingleCommentResource($query->execute(
            commentId: $commentId->value,
            currentUserId: $currentUserId,
        )))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Comment author が Comment を削除する。
     */
    public function destroy(
        Request $request,
        string $slug,
        string $id,
        GetCommentForAuthorizationQuery $commentForAuthorization,
        DeleteCommentCommand $command,
    ): JsonResponse {
        $commentId = ctype_digit($id) ? (int) $id : 0;
        $comment = $commentForAuthorization->execute($slug, $commentId);
        Gate::forUser($request->user('api'))->authorize('delete', $comment);

        $command->execute($comment);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
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
