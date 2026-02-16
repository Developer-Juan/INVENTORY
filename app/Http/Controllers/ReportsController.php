<?php

namespace App\Http\Controllers;

use App\Exports\Sales\SalesReportExport;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ReportsController extends Controller
{
    public function salesPage(Request $request)
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin');
        $isSuperAdmin = $roles->contains('super-admin');

        $deliverers = User::dealerLikeQuery()
            ->whereIn('id', \App\Models\Location::where('type', 'dealer')->whereNotNull('user_id')->pluck('user_id'))
            ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->where('created_by', $user->id))
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $saleStatuses = [
            'pagado' => 'Pagado',
            'parcial' => 'Parcial',
            'debe' => 'Debe',
            'anulada' => 'Anulada',
            'gift' => 'Regalo',
        ];

        $query = $this->baseSalesQuery($request, false);
        $sales = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        $totals = [
            'count' => (clone $query)->count(),
            'subtotal' => (float) (clone $query)->sum('subtotal'),
            'discount' => (float) (clone $query)->sum('discount'),
            'tax' => (float) (clone $query)->sum('tax'),
            'total' => (float) (clone $query)->sum('total'),
            'paid' => (float) (clone $query)->sum('paid'),
            'balance' => (float) (clone $query)->sum('balance'),
        ];

        return \Inertia\Inertia::render('Reports/Sales', [
            'deliverers' => $deliverers,
            'saleStatuses' => $saleStatuses,
            'sales' => $sales,
            'totals' => $totals,
            'filters' => [
                'dealer_id' => $request->input('dealer_id', ''),
                'from_date' => $request->input('from_date', ''),
                'to_date' => $request->input('to_date', ''),
                'status' => $request->input('status', ''),
            ],
        ]);
    }
    public function salesExcel(Request $request)
    {
        $sales = $this->baseSalesQuery($request, true)->orderByDesc('created_at')->get();
        $filename = 'ventas_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new SalesReportExport($sales), $filename);
    }

    public function salesPdf(Request $request)
    {
        $sales = $this->baseSalesQuery($request, true)->orderByDesc('created_at')->get();

        $totals = [
            'count' => $sales->count(),
            'subtotal' => (float) $sales->sum('subtotal'),
            'discount' => (float) $sales->sum('discount'),
            'tax' => (float) $sales->sum('tax'),
            'total' => (float) $sales->sum('total'),
            'paid' => (float) $sales->sum('paid'),
            'balance' => (float) $sales->sum('balance'),
        ];

        $logoPath = public_path('logo.png');
        $logoData = null;
        if (file_exists($logoPath)) {
            $ext = pathinfo($logoPath, PATHINFO_EXTENSION);
            $logoData = 'data:image/' . $ext . ';base64,' . base64_encode(file_get_contents($logoPath));
        }

        $pdf = Pdf::loadView('reports.sales-pdf', [
            'sales' => $sales,
            'totals' => $totals,
            'logoData' => $logoData,
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape');

        $filename = 'ventas_' . now()->format('Ymd_His') . '.pdf';
        $output = $pdf->output();
        return response($output, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function baseSalesQuery(Request $request, bool $withDetails): Builder
    {
        $user = auth()->user();
        $dealerId = $request->input('dealer_id');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $paymentMethodId = $request->input('payment_method_id');
        $status = $request->input('status');

        $salesQuery = Sale::query()
            ->with([
                'user:id,name',
                'customerUser:id,name,phone',
                'delivery:id,name',
            ])
            ->select(
                'id',
                'user_id',
                'customer_user_id',
                'debtor_name',
                'debtor_phone',
                'subtotal',
                'discount',
                'tax',
                'total',
                'paid',
                'balance',
                'status',
                'delivery_id',
                'km',
                'created_at'
            );

        if ($withDetails) {
            $salesQuery->with([
                'items' => fn($q) => $q->select('id', 'sale_id', 'inventory_id', 'quantity', 'unit_price', 'discount', 'total')
                    ->with(['inventory:id,name,unit']),
                'payments' => fn($q) => $q->select('id', 'sale_id', 'payment_method_id', 'amount', 'reference', 'paid_at')
                    ->with(['method:id,code,name']),
            ]);
        }

        if (!empty($dealerId)) {
            $salesQuery->where('delivery_id', $dealerId);
        }

        $roles = $user && method_exists($user, 'getRoleNames') ? $user->getRoleNames() : collect();
        if ($user && $roles->contains('dealer')) {
            $salesQuery->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhere('delivery_id', $user->id);
            });
        }
        if ($user && $roles->contains('admin') && !$roles->contains('super-admin')) {
            $userIds = User::adminScopedUserIds($user);
            $salesQuery->where(function ($q) use ($userIds) {
                $q->whereIn('user_id', $userIds)
                    ->orWhereIn('delivery_id', $userIds);
            });
        }

        if (!empty($status)) {
            $salesQuery->where('status', $status);
        }

        if (!empty($paymentMethodId)) {
            $salesQuery->whereHas('payments', function ($q) use ($paymentMethodId) {
                $q->where('payment_method_id', $paymentMethodId);
            });
        }

        $tz = config('app.timezone');
        if (!empty($fromDate) && !empty($toDate)) {
            $startLocal = Carbon::parse($fromDate, $tz)->startOfDay();
            $startUtc = $startLocal->copy()->utc();
            $endLocal = Carbon::parse($toDate, $tz)->endOfDay();
            $endUtc = $endLocal->copy()->utc();
            $salesQuery->whereBetween('created_at', [$startUtc, $endUtc]);
        } elseif (!empty($fromDate)) {
            $startLocal = Carbon::parse($fromDate, $tz)->startOfDay();
            $startUtc = $startLocal->copy()->utc();
            $salesQuery->where('created_at', '>=', $startUtc);
        } elseif (!empty($toDate)) {
            $endLocal = Carbon::parse($toDate, $tz)->endOfDay();
            $endUtc = $endLocal->copy()->utc();
            $salesQuery->where('created_at', '<=', $endUtc);
        }

        return $salesQuery;
    }
}
