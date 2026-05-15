<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 50)->nullable()->after('id');
            $table->string('password_hash')->nullable()->after('email');
            $table->text('bio')->nullable()->after('password_hash');
            $table->string('image', 2048)->nullable()->after('bio');
            $table->softDeletes()->after('updated_at')->index('users_deleted_at_index');
        });

        DB::table('users')
            ->select(['id', 'password'])
            ->orderBy('id')
            ->get()
            ->each(function (object $user): void {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'username' => 'user-'.$user->id,
                        'password_hash' => $user->password,
                    ]);
            });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 50)->nullable(false)->change();
            $table->string('password_hash')->nullable(false)->change();
            $table->unique('username', 'users_username_unique');
            $table->dropColumn(['name', 'email_verified_at', 'password', 'remember_token']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('name')->nullable()->after('id');
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('password')->nullable()->after('email_verified_at');
            $table->rememberToken()->after('password');
        });

        DB::table('users')
            ->select(['id', 'username', 'password_hash'])
            ->orderBy('id')
            ->get()
            ->each(function (object $user): void {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'name' => $user->username,
                        'password' => $user->password_hash,
                    ]);
            });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('name')->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
            $table->dropUnique('users_username_unique');
            $table->dropIndex('users_deleted_at_index');
            $table->dropColumn(['username', 'password_hash', 'bio', 'image', 'deleted_at']);
        });
    }
};
