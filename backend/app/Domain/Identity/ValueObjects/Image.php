<?php

declare(strict_types=1);

namespace App\Domain\Identity\ValueObjects;

use InvalidArgumentException;

final readonly class Image
{
    public ?string $value;

    /**
     * Profile に表示する nullable な image URL を表す。
     */
    public function __construct(?string $value)
    {
        if ($value === null) {
            $this->value = null;

            return;
        }

        $normalized = trim($value);

        if ($normalized === '' || strlen($normalized) > 2048 || filter_var($normalized, FILTER_VALIDATE_URL) === false) {
            throw new InvalidArgumentException('Image is invalid.');
        }

        $this->value = $normalized;
    }
}
