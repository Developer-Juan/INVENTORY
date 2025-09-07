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
            // Cliente (opcional, 4 dígitos como string)
            'customer_id' => ['nullable', 'string', 'regex:/^\d{4}$/'],

            // Delivery (opcional) y km obligatorios si hay delivery
            'delivery_id' => ['nullable', 'integer', 'exists:users,id'],
            'km' => ['sometimes', 'numeric', 'gt:0'],


            // Totales/ajustes
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],

            // Ítems
            'items' => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'integer', 'exists:inventories,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.5', new MultipleOf(0.5)],
            // unit_price puede venir (lo envías calculado) o puedes caer a sale_price en el controller
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0.01'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],

            // Pagos
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.00'],
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
