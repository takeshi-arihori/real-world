<?php

declare(strict_types=1);

namespace App\Presentation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class NormalizeRealWorldAuthorizationHeader
{
    /**
     * RealWorld compatible `Token` auth scheme を Sanctum の bearer token として扱う。
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = $request->headers->get('Authorization');

        if (is_string($authorization) && preg_match('/^Token\s+(.+)$/i', $authorization, $matches) === 1) {
            $request->headers->set('Authorization', 'Bearer '.trim($matches[1]));
        }

        return $next($request);
    }
}
