<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\ServiceQualityProductRating;
use App\Models\ServiceQualityReview;
use App\Models\ServiceQualityToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Str;

class ServiceQualityController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');
        $isSuperAdmin = $roles->contains('super-admin');
        $dealerIds = collect();
        if ($isAdmin && !$isSuperAdmin) {
            $dealerIds = User::role('dealer')->where('created_by', $user->id)->pluck('id');
        }

        $dealerFilter = $request->query('dealer_id');

        $latestIds = ServiceQualityToken::select(DB::raw('MAX(id)'))->groupBy('sale_id');

        $tokens = ServiceQualityToken::query()
            ->whereIn('id', $latestIds)
            ->when(!$isAdmin, function ($q) use ($user) {
                $q->whereHas('sale', function ($sq) use ($user) {
                    $sq->where('delivery_id', $user->id);
                });
            })
            ->when($isAdmin && !$isSuperAdmin, function ($q) use ($dealerIds) {
                $q->whereHas('sale', function ($sq) use ($dealerIds) {
                    $sq->whereIn('delivery_id', $dealerIds);
                });
            })
            ->with([
                'sale:id,delivery_id,customer_user_id,status,created_at',
                'sale.customerUser:id,name,phone',
                'dealer:id,name',
            ])
            ->latest('id')
            ->get();

        $reviewsQuery = ServiceQualityReview::query()
            ->with([
                'sale:id,delivery_id,customer_user_id,status,created_at',
                'sale.customerUser:id,name,phone',
                'dealer:id,name',
                'productRatings.saleItem.inventory:id,name',
            ])
            ->latest('id')
            ->when(!$isAdmin, function ($q) use ($user) {
                $q->where('dealer_user_id', $user->id);
            })
            ->when($isAdmin && !$isSuperAdmin, function ($q) use ($dealerIds) {
                $q->whereIn('dealer_user_id', $dealerIds);
            })
            ->when($dealerFilter, function ($q) use ($dealerFilter) {
                $q->where('dealer_user_id', (int) $dealerFilter);
            });

        $reviews = $reviewsQuery->get();

        $dealers = [];
        $rankingByDealer = [];
        $rankingByProduct = [];

        if ($isAdmin) {
            $dealers = User::role('dealer')
                ->when(!$isSuperAdmin, fn($q) => $q->where('created_by', $user->id))
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            $rankingByDealer = ServiceQualityReview::query()
                ->select('dealer_user_id', DB::raw('AVG(rating_dealer) as avg_rating'), DB::raw('COUNT(*) as total'))
                ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->whereIn('dealer_user_id', $dealerIds))
                ->when($dealerFilter, fn($q) => $q->where('dealer_user_id', (int) $dealerFilter))
                ->groupBy('dealer_user_id')
                ->orderByDesc('avg_rating')
                ->with('dealer:id,name')
                ->get()
                ->map(function ($r) {
                    $r->avg_rating = round((float) $r->avg_rating, 2);
                    $r->total = (int) $r->total;
                    return $r;
                });

            $rankingByProduct = ServiceQualityProductRating::query()
                ->join('service_quality_reviews as r', 'r.id', '=', 'service_quality_product_ratings.review_id')
                ->join('sale_items as si', 'si.id', '=', 'service_quality_product_ratings.sale_item_id')
                ->join('inventories as i', 'i.id', '=', 'si.inventory_id')
                ->select(
                    'si.inventory_id',
                    'i.name as name',
                    DB::raw('AVG(service_quality_product_ratings.rating) as avg_rating'),
                    DB::raw('COUNT(*) as total')
                )
                ->when($isAdmin && !$isSuperAdmin, fn($q) => $q->whereIn('r.dealer_user_id', $dealerIds))
                ->when($dealerFilter, fn($q) => $q->where('r.dealer_user_id', (int) $dealerFilter))
                ->groupBy('si.inventory_id', 'i.name')
                ->orderByDesc('avg_rating')
                ->limit(20)
                ->get()
                ->map(function ($r) {
                    $r->avg_rating = round((float) $r->avg_rating, 2);
                    $r->total = (int) $r->total;
                    return $r;
                });
        }

        return Inertia::render('Quality/Index', [
            'tokens' => $tokens,
            'reviews' => $reviews,
            'isAdmin' => $isAdmin,
            'dealers' => $dealers,
            'filters' => [
                'dealer_id' => $dealerFilter ? (int) $dealerFilter : '',
            ],
            'rankingByDealer' => $rankingByDealer,
            'rankingByProduct' => $rankingByProduct,
        ]);
    }

    public function createToken(Sale $sale)
    {
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');

        if (!$isAdmin && (int) $sale->delivery_id !== (int) $user->id) {
            abort(403);
        }
        if (empty($sale->delivery_id)) {
            throw ValidationException::withMessages([
                'sale' => 'La venta no tiene dealer asociado.',
            ]);
        }

        ServiceQualityToken::create([
            'sale_id' => $sale->id,
            'dealer_user_id' => (int) $sale->delivery_id,
            'token' => Str::random(40),
            'expires_at' => now()->addHour(),
            'created_by' => $user->id,
        ]);

        return back()->with('success', 'Link generado.');
    }

    public function publicShow(string $token)
    {
        $row = ServiceQualityToken::query()
            ->where('token', $token)
            ->with([
                'sale:id,delivery_id,customer_user_id,status,created_at',
                'sale.customerUser:id,name,phone',
                'sale.items.inventory:id,name,unit',
                'dealer:id,name',
            ])
            ->first();

        if (!$row) {
            return Inertia::render('Quality/Public', [
                'tokenValid' => false,
                'message' => 'Link inválido.',
            ]);
        }

        $expired = $row->expires_at && $row->expires_at->isPast();
        $used = !empty($row->used_at);

        return Inertia::render('Quality/Public', [
            'tokenValid' => !$expired && !$used,
            'message' => $expired ? 'El link expiró.' : ($used ? 'Este link ya fue usado.' : ''),
            'token' => $row->token,
            'expires_at' => $row->expires_at,
            'sale' => $row->sale,
            'dealer' => $row->dealer,
        ]);
    }

    public function publicSubmit(Request $request, string $token)
    {
        $row = ServiceQualityToken::query()
            ->where('token', $token)
            ->with('sale.items')
            ->first();

        if (!$row) {
            return back()->with('error', 'Link inválido.');
        }

        if ($row->used_at) {
            return back()->with('error', 'Este link ya fue usado.');
        }

        if ($row->expires_at && $row->expires_at->isPast()) {
            return back()->with('error', 'El link expiró.');
        }

        $data = $request->validate([
            'rating_dealer' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'product_ratings' => ['required', 'array', 'min:1'],
            'product_ratings.*.sale_item_id' => ['required', 'integer'],
            'product_ratings.*.rating' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        $saleItemIds = $row->sale->items->pluck('id')->map(fn($v) => (int) $v)->all();
        foreach ($data['product_ratings'] as $pr) {
            if (!in_array((int) $pr['sale_item_id'], $saleItemIds, true)) {
                throw ValidationException::withMessages([
                    'product_ratings' => 'Los productos no corresponden a la venta.',
                ]);
            }
        }

        DB::transaction(function () use ($row, $data) {
            $review = ServiceQualityReview::create([
                'token_id' => $row->id,
                'sale_id' => $row->sale_id,
                'dealer_user_id' => $row->dealer_user_id,
                'rating_dealer' => (int) $data['rating_dealer'],
                'comment' => $data['comment'] ?? null,
            ]);

            foreach ($data['product_ratings'] as $pr) {
                ServiceQualityProductRating::create([
                    'review_id' => $review->id,
                    'sale_item_id' => (int) $pr['sale_item_id'],
                    'rating' => (int) $pr['rating'],
                ]);
            }

            $row->used_at = now();
            $row->save();
        });

        return back()->with('success', 'Gracias por tu calificación.');
    }
}
