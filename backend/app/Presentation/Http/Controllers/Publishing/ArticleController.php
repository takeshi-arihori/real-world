<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Publishing;

use App\Application\Publishing\Commands\CreateArticleCommand;
use App\Application\Publishing\Commands\DeleteArticleCommand;
use App\Application\Publishing\Commands\UpdateArticleCommand;
use App\Application\Publishing\Queries\GetArticleForAuthorizationQuery;
use App\Application\Publishing\Queries\GetArticleQuery;
use App\Application\Publishing\Queries\ListArticlesQuery;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Requests\Publishing\CreateArticleRequest;
use App\Presentation\Http\Requests\Publishing\ListArticlesRequest;
use App\Presentation\Http\Requests\Publishing\UpdateArticleRequest;
use App\Presentation\Http\Resources\Publishing\ArticleListResource;
use App\Presentation\Http\Resources\Publishing\SingleArticleResource;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

final class ArticleController extends Controller
{
    /**
     * Article 一覧を RealWorld multiple articles wrapper で返す。
     */
    public function index(ListArticlesRequest $request, ListArticlesQuery $query): JsonResponse
    {
        return (new ArticleListResource($query->execute(
            dto: $request->toDto(),
            currentUserId: $this->optionalAuthenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Article を作成し、RealWorld single article wrapper で返す。
     */
    public function store(
        CreateArticleRequest $request,
        CreateArticleCommand $command,
        GetArticleQuery $query,
    ): JsonResponse {
        $article = $command->execute(
            authorUserId: $this->authenticatedUserId($request),
            dto: $request->toDto(),
        );

        return (new SingleArticleResource($query->execute(
            slug: $article->slug()->value,
            currentUserId: $this->authenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Article 詳細を RealWorld single article wrapper で返す。
     */
    public function show(Request $request, string $slug, GetArticleQuery $query): JsonResponse
    {
        return (new SingleArticleResource($query->execute(
            slug: $slug,
            currentUserId: $this->optionalAuthenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Article author が Article を更新する。
     */
    public function update(
        UpdateArticleRequest $request,
        string $slug,
        GetArticleForAuthorizationQuery $articleForAuthorization,
        UpdateArticleCommand $command,
        GetArticleQuery $query,
    ): JsonResponse {
        $article = $articleForAuthorization->execute($slug);
        Gate::forUser($request->user('api'))->authorize('update', $article);

        $updated = $command->execute($article, $request->toDto());

        return (new SingleArticleResource($query->execute(
            slug: $updated->slug()->value,
            currentUserId: $this->authenticatedUserId($request),
        )))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Article author が Article を削除する。
     */
    public function destroy(
        Request $request,
        string $slug,
        GetArticleForAuthorizationQuery $articleForAuthorization,
        DeleteArticleCommand $command,
    ): JsonResponse {
        $article = $articleForAuthorization->execute($slug);
        Gate::forUser($request->user('api'))->authorize('delete', $article);

        $command->execute($article);

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
