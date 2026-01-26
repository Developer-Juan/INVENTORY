<?php

namespace App\Exports\Sales;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;

class SalePaymentsSheet implements FromCollection, WithHeadings, WithTitle
{
    private $sales;

    public function __construct($sales)
    {
        $this->sales = $sales;
    }

    public function title(): string
    {
        return 'Pagos';
    }

    public function headings(): array
    {
        return [
            'Venta ID',
            'Fecha',
            'Metodo',
            'Monto',
            'Referencia',
            'Pagado en',
        ];
    }

    public function collection()
    {
        $rows = [];
        foreach ($this->sales as $sale) {
            foreach ($sale->payments ?? [] as $payment) {
                $rows[] = [
                    $sale->id,
                    $this->fmtDate($sale->created_at),
                    $payment->method?->name ?? '',
                    (float) $payment->amount,
                    $payment->reference ?? '',
                    $this->fmtDate($payment->paid_at),
                ];
            }
        }
        return collect($rows);
    }

    private function fmtDate($value): string
    {
        if (!$value) {
            return '';
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i');
        }
        try {
            return Carbon::parse($value)->format('Y-m-d H:i');
        } catch (\Throwable $e) {
            return '';
        }
    }
}
