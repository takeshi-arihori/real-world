<?php

declare(strict_types=1);

namespace Tests\Fixtures;

use Illuminate\Foundation\Http\FormRequest;

class RealWorldErrorResponseTestRequest extends FormRequest
{
    /**
     * エラーレスポンス変換のテスト用 FormRequest は認可を常に通す。
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * 複数 field の validation message 平坦化を検証するための最小ルールを返す。
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string'],
            'body' => ['required', 'string'],
        ];
    }

    /**
     * locale や翻訳ファイルの有無に依存しない validation message を返す。
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'title is required',
            'body.required' => 'body is required',
        ];
    }
}
