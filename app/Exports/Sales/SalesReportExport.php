<?php

namespace App\Exports\Sales;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class SalesReportExport implements WithMultipleSheets
{
    private $sales;

    public function __construct($sales)
    {
        $this->sales = $sales;
    }

    public function sheets(): array
    {
        return [
            new SalesSheet($this->sales),
            new SaleItemsSheet($this->sales),
            new SalePaymentsSheet($this->sales),
        ];
    }
}
