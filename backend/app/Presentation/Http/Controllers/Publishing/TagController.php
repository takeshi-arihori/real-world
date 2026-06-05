<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Publishing;

use App\Application\Publishing\Queries\ListTagsQuery;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Resources\Publishing\TagListResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class TagController extends Controller
{
    /**
     * 登録済み Tag 一覧を RealWorld tags wrapper で返す。
     */
    public function index(ListTagsQuery $query): JsonResponse
    {
        return (new TagListResource($query->execute()))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
