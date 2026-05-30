<?php

return [
    'signing_secret' => env('JWT_SIGNING_SECRET'),
    'ttl_minutes' => (int) env('JWT_TTL_MINUTES', 60),
];
