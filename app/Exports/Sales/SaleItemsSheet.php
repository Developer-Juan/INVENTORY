<?php

namespace App\Exports\Sales;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;

class SaleItemsSheet implements FromCollection, WithHeadings, WithTitle
{
    private $sales;

    public function __construct($sales)
    {
        $this->sales = $sales;
    }

    public function title(): string
    {
        return 'Items';
    }

    public function headings(): array
    {
        return [
            'Venta ID',
            'Fecha',
            'Producto',
            'Unidad',
            'Cantidad',
            'Precio unitario',
            'Descuento',
            'Total',
        ];
    }

    public function collection()
    {
        $rows = [];
        foreach ($this->sales as $sale) {
            foreach ($sale->items ?? [] as $item) {
                $rows[] = [
                    $sale->id,
                    $this->fmtDate($sale->created_at),
                    $item->inventory?->name ?? '',
                    $item->inventory?->unit ?? '',
                    (float) $item->quantity,
                    (float) $item->unit_price,
                    (float) $item->discount,
                    (float) $item->total,
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
