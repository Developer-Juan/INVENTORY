<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Reporte de ventas</title>
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 12px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .logo { height: 40px; }
        h1 { font-size: 18px; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .totals { margin-top: 12px; }
        .totals td { border: none; padding: 4px 0; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Reporte de ventas</h1>
            <div>Generado: {{ $generatedAt->format('Y-m-d H:i') }}</div>
        </div>
        @if($logoData)
            <img class="logo" src="{{ $logoData }}" alt="Logo">
        @endif
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($sales as $sale)
                <tr>
                    <td>{{ $sale->id }}</td>
                    <td>{{ optional($sale->created_at)->format('Y-m-d H:i') }}</td>
                    <td>{{ optional($sale->user)->name }}</td>
                    <td>{{ optional($sale->customerUser)->name ?? $sale->debtor_name }}</td>
                    <td>{{ $sale->status }}</td>
                    <td class="right">{{ number_format($sale->total, 2, ',', '.') }}</td>
                    <td class="right">{{ number_format($sale->paid, 2, ',', '.') }}</td>
                    <td class="right">{{ number_format($sale->balance, 2, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td>Total ventas:</td>
            <td class="right">{{ $totals['count'] }}</td>
        </tr>
        <tr>
            <td>Subtotal:</td>
            <td class="right">{{ number_format($totals['subtotal'], 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Descuento:</td>
            <td class="right">{{ number_format($totals['discount'], 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Impuesto:</td>
            <td class="right">{{ number_format($totals['tax'], 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Total:</td>
            <td class="right">{{ number_format($totals['total'], 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Pagado:</td>
            <td class="right">{{ number_format($totals['paid'], 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td>Saldo:</td>
            <td class="right">{{ number_format($totals['balance'], 2, ',', '.') }}</td>
        </tr>
    </table>
</body>
</html>
