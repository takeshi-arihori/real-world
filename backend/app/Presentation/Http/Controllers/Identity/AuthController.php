<?php

declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Identity;

use App\Application\Identity\Commands\LoginUserCommand;
use App\Application\Identity\Commands\RegisterUserCommand;
use App\Presentation\Http\Controllers\Controller;
use App\Presentation\Http\Requests\Identity\LoginUserRequest;
use App\Presentation\Http\Requests\Identity\RegisterUserRequest;
use App\Presentation\Http\Resources\Identity\UserResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class AuthController extends Controller
{
    /**
     * User 登録 API のリクエストを Application 層へ委譲する。
     */
    public function register(RegisterUserRequest $request, RegisterUserCommand $command): JsonResponse
    {
        return (new UserResource($command->execute($request->toDto())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * User ログイン API のリクエストを Application 層へ委譲する。
     */
    public function login(LoginUserRequest $request, LoginUserCommand $command): JsonResponse
    {
        return (new UserResource($command->execute($request->toDto())))
            ->response()
            ->setStatusCode(Response::HTTP_OK);
    }
}
