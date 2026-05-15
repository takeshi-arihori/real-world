<?php

declare(strict_types=1);

namespace Tests\Fixtures;

use Illuminate\Foundation\Http\FormRequest;

class RealWorldErrorResponseTestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
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
