<?php
// app/Rules/MultipleOf.php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class MultipleOf implements Rule
{
    /** @var float */
    protected $step;

    public function __construct(float $step)
    {
        $this->step = $step;
    }

    public function passes($attribute, $value): bool
    {
        if (!is_numeric($value)) {
            return false;
        }

        $v = (float) $value;
        $eps = 1e-9;

        // Evita problemas de punto flotante
        $mod = fmod($v, $this->step);
        if (abs($mod) < $eps || abs($mod - $this->step) < $eps) {
            return true;
        }

        return false;
    }

    public function message(): string
    {
        // Ojo: :attribute lo reemplaza el validador con el nombre del campo
        return "El campo :attribute debe ser múltiplo de {$this->step}.";
    }
}
