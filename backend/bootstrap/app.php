<?php

use App\Presentation\Http\Responses\RealWorldErrorResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(
            fn (Request $request): ?string => $request->is('api/*') ? null : route('login')
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $exception): bool => RealWorldErrorResponse::shouldRenderFor($request)
        );

        $exceptions->render(function (Throwable $exception, Request $request): ?JsonResponse {
            if (! RealWorldErrorResponse::shouldRenderFor($request)) {
                return null;
            }

            return RealWorldErrorResponse::fromThrowable($exception);
        });
    })->create();
