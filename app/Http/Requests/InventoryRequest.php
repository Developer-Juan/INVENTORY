<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InventoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'name' => ['required', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:500'],

            'unit' => ['required', 'in:pcs,gr'],

            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],

            // STOCK INICIAL del producto (store) o cantidad global (update)
            // Permitimos 0, 1, 1.5, 2, 2.5, etc.
            'quantity' => [
                'nullable',
                'numeric',
                'regex:/^\d+(\.0|\.5)?$/',
            ],

            // Mínimo en bodega principal. También puede ser 0.5
            'min_stock' => [
                'nullable',
                'numeric',
                'regex:/^\d+(\.0|\.5)?$/',
            ],

            // --- Estos normalmente llegan SOLO en update() cuando haces ajuste de stock ---
            // none | set | inc
            'stock_op' => [
                'nullable',
                'in:none,set,inc',
            ],

            // valor de ajuste o valor absoluto, puede ser negativo en inc
            // Ej: -0.5, 0.5, 2, 3.5
            'stock_value' => [
                'nullable',
                'numeric',
                'regex:/^\-?\d+(\.0|\.5)?$/',
            ],

            // ubicación sobre la cual aplicar el ajuste
            'location_id' => [
                'nullable',
                'exists:locations,id',
            ],
        ];
    }

}
