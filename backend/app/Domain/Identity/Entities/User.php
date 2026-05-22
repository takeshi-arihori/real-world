<?php

declare(strict_types=1);

namespace App\Domain\Identity\Entities;

use App\Domain\Identity\ValueObjects\Bio;
use App\Domain\Identity\ValueObjects\Email;
use App\Domain\Identity\ValueObjects\HashedPassword;
use App\Domain\Identity\ValueObjects\Image;
use App\Domain\Identity\ValueObjects\UserId;
use App\Domain\Identity\ValueObjects\Username;

final readonly class User
{
    public function __construct(
        private ?UserId $id,
        private Username $username,
        private Email $email,
        private HashedPassword $passwordHash,
        private Bio $bio,
        private Image $image,
    ) {}

    /**
     * 登録直後の User を生成する。
     */
    public static function register(Username $username, Email $email, HashedPassword $passwordHash): self
    {
        return new self(
            id: null,
            username: $username,
            email: $email,
            passwordHash: $passwordHash,
            bio: new Bio(null),
            image: new Image(null),
        );
    }

    /**
     * 永続化後の ID を持つ User として複製する。
     */
    public function withId(UserId $id): self
    {
        return new self(
            id: $id,
            username: $this->username,
            email: $this->email,
            passwordHash: $this->passwordHash,
            bio: $this->bio,
            image: $this->image,
        );
    }

    /**
     * 更新後の Identity 情報と profile fields を持つ User として複製する。
     */
    public function withUpdatedIdentity(
        Username $username,
        Email $email,
        HashedPassword $passwordHash,
        Bio $bio,
        Image $image,
    ): self {
        return new self(
            id: $this->id,
            username: $username,
            email: $email,
            passwordHash: $passwordHash,
            bio: $bio,
            image: $image,
        );
    }

    public function id(): ?UserId
    {
        return $this->id;
    }

    public function username(): Username
    {
        return $this->username;
    }

    public function email(): Email
    {
        return $this->email;
    }

    public function passwordHash(): HashedPassword
    {
        return $this->passwordHash;
    }

    public function bio(): Bio
    {
        return $this->bio;
    }

    public function image(): Image
    {
        return $this->image;
    }
}
