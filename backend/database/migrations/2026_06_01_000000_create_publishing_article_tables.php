<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('author_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('slug')->unique('articles_slug_unique');
            $table->string('title');
            $table->string('description');
            $table->text('body');
            $table->timestamps();

            $table->index(['author_user_id', 'created_at'], 'articles_author_user_id_created_at_index');
            $table->index('created_at', 'articles_created_at_index');
        });

        Schema::create('comments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('article_id')
                ->constrained('articles')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('author_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->text('body');
            $table->timestamps();

            $table->index(['article_id', 'created_at'], 'comments_article_id_created_at_index');
            $table->index('author_user_id', 'comments_author_user_id_index');
        });

        Schema::create('tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 50)->unique('tags_name_unique');
            $table->timestamps();
        });

        Schema::create('article_tag', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('article_id')
                ->constrained('articles')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('tag_id')
                ->constrained('tags')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['article_id', 'tag_id'], 'article_tag_article_id_tag_id_unique');
            $table->index('tag_id', 'article_tag_tag_id_index');
        });

        Schema::create('follows', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('follower_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('followee_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['follower_user_id', 'followee_user_id'], 'follows_follower_followee_unique');
            $table->index('followee_user_id', 'follows_followee_user_id_index');
        });

        Schema::create('favorites', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('article_id')
                ->constrained('articles')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['user_id', 'article_id'], 'favorites_user_id_article_id_unique');
            $table->index('article_id', 'favorites_article_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('favorites');
        Schema::dropIfExists('follows');
        Schema::dropIfExists('article_tag');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('articles');
    }
};
