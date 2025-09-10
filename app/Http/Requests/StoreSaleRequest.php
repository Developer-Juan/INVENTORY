<?php

namespace App\Http\Requests;


use App\Rules\MultipleOf;
use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Cliente (opcional)
            'customer_id' => ['nullable', 'string', 'regex:/^\d{4}$/'],

            // Delivery (opcional)
            'delivery_id' => ['nullable', 'integer', 'exists:users,id'],
            'km' => ['sometimes', 'numeric', 'gt:0'],

            // Totales cabecera
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],

            // Ítems
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'integer', 'exists:inventories,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.5', new MultipleOf(0.5)],
            // Acepta cualquiera de los dos; validaremos en el controlador que venga al menos uno
            'items.*.total_price' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],

            // Pagos
            'payments' => ['nullable', 'array'],
            'payments.*.payment_method_id' => ['required_with:payments', 'integer', 'exists:payment_methods,id'],
            'payments.*.amount' => ['required_with:payments', 'numeric', 'min:0.01'],
            'payments.*.reference' => ['nullable', 'string', 'max:191'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.regex' => 'El ID de cliente debe tener 4 dígitos.',
            'km.required_with' => 'Ingresa los KM si seleccionas un repartidor.',
        ];
    }

}
