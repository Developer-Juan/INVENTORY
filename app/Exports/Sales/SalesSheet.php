<?php

namespace App\Exports\Sales;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class SalesSheet implements FromCollection, WithHeadings, WithTitle, WithColumnFormatting
{
    private $sales;

    public function __construct($sales)
    {
        $this->sales = $sales;
    }

    public function title(): string
    {
        return 'Ventas';
    }

    public function headings(): array
    {
        return [
            'ID',
            'Fecha',
            'Vendedor',
            'Cliente',
            'Telefono',
            'Estado',
            'Subtotal',
            'Descuento',
            'Impuesto',
            'Total',
            'Pagado',
            'Saldo',
            'Delivery',
            'KM',
            'Metodos de pago',
        ];
    }

    public function collection()
    {
        return $this->sales->map(function ($sale) {
            $methods = $sale->payments
                ? $sale->payments->map(fn($p) => $p->method?->name)->filter()->unique()->values()->implode(', ')
                : '';

            return [
                $sale->id,
                $this->fmtDate($sale->created_at),
                $sale->user?->name ?? '',
                $sale->customerUser?->name ?? ($sale->debtor_name ?? ''),
                $this->asExcelText($sale->customerUser?->phone ?? ($sale->debtor_phone ?? '')),
                $sale->status,
                (float) $sale->subtotal,
                (float) $sale->discount,
                (float) $sale->tax,
                (float) $sale->total,
                (float) $sale->paid,
                (float) $sale->balance,
                $sale->delivery?->name ?? '',
                (float) ($sale->km ?? 0),
                $methods,
            ];
        });
    }

    public function columnFormats(): array
    {
        return [
            'E' => NumberFormat::FORMAT_TEXT, // Telefono
        ];
    }

    private function asExcelText($value): string
    {
        $text = (string) ($value ?? '');
        if ($text === '') {
            return '';
        }
        // Prefijo apostrofe fuerza a Excel a tratarlo como texto (oculto al mostrar).
        return "'" . $text;
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
