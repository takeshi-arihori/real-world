<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $username
 * @property string $email
 * @property string $password_hash
 * @property string|null $bio
 * @property string|null $image
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'email',
        'password_hash',
        'bio',
        'image',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Laravel auth が参照する password hash カラム名を返す。
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * Laravel auth が参照する password hash を返す。
     */
    public function getAuthPassword(): string
    {
        return (string) $this->getAttribute($this->getAuthPasswordName());
    }

    /**
     * Infrastructure 配置の User factory を返す。
     */
    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }
}
