<?php

namespace App\Http\Controllers;

use App\Models\CustomerPoint;
use App\Models\PointsReward;
use App\Models\PointsSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;

class PointsController extends Controller
{
    private function resolvePointsAdminId(User $actor): ?int
    {
        $roles = method_exists($actor, 'getRoleNames') ? $actor->getRoleNames() : collect();
        if ($roles->contains('admin') || $roles->contains('super-admin')) {
            return $actor->id;
        }
        if ($roles->contains('dealer') && !empty($actor->created_by)) {
            return (int) $actor->created_by;
        }
        return $actor->id;
    }

    public function publicLookupPage()
    {
        return Inertia::render('Points/PublicLookup');
    }

    public function publicLookup(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\d{7,15}$/'],
        ]);

        $phone = $data['phone'];
        $role = Role::firstOrCreate(['name' => 'customer']);
        $user = User::role($role->name)->where('phone', $phone)->first();
        if (!$user) {
            $alt = null;
            if (strlen($phone) === 12 && str_starts_with($phone, '57')) {
                $alt = substr($phone, 2);
            } elseif (strlen($phone) === 10) {
                $alt = '57' . $phone;
            }
            if ($alt) {
                $user = User::role($role->name)->where('phone', $alt)->first();
            }
        }
        if (!$user) {
            return response()->json(['found' => false]);
        }

        $points = CustomerPoint::firstOrCreate(
            ['user_id' => $user->id, 'admin_id' => null],
            ['points_balance' => 0]
        );

        $breakdown = DB::table('points_transactions as pt')
            ->leftJoin('users as a', 'a.id', '=', 'pt.admin_id')
            ->where('pt.user_id', $user->id)
            ->select([
                'pt.admin_id',
                DB::raw('SUM(pt.points) as points_balance'),
                DB::raw("COALESCE(a.name, 'Sin admin') as admin_name"),
            ])
            ->groupBy('pt.admin_id', 'admin_name')
            ->orderByDesc('points_balance')
            ->get()
            ->map(function ($row) {
                return [
                    'admin_id' => $row->admin_id,
                    'admin_name' => $row->admin_name,
                    'points_balance' => (int) $row->points_balance,
                ];
            })
            ->values();

        $totalPoints = (int) $breakdown->sum('points_balance');

        return response()->json([
            'found' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'points_balance' => $totalPoints,
            ],
            'breakdown' => $breakdown,
        ]);
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $adminId = $user ? $this->resolvePointsAdminId($user) : null;

        $settings = PointsSetting::firstOrCreate(
            ['admin_id' => $adminId],
            [
                'value_per_point' => 0,
                'redemption_info' => null,
            ]
        );

        $rewards = PointsReward::query()
            ->where('admin_id', $adminId)
            ->orderBy('points_required')
            ->get();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');
        $search = trim((string) $request->get('q', ''));
        $pointsUsers = [];
        if ($isAdmin) {
            $pointsUsers = CustomerPoint::with(['user:id,name,phone,email'])
                ->select('id', 'user_id', 'points_balance')
                ->where('admin_id', $adminId)
                ->when($search !== '', function ($q) use ($search) {
                    $q->whereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
                })
                ->orderByDesc('points_balance')
                ->paginate(15)
                ->withQueryString();
        }

        return Inertia::render('Points/Index', [
            'settings' => $settings,
            'rewards' => $rewards,
            'pointsUsers' => $pointsUsers,
            'filters' => [
                'q' => $search,
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'value_per_point' => ['required', 'numeric', 'min:0'],
            'redemption_info' => ['nullable', 'string'],
        ]);

        $actor = $request->user();
        $adminId = $actor ? $this->resolvePointsAdminId($actor) : null;
        $settings = PointsSetting::firstOrNew(['admin_id' => $adminId]);
        $settings->fill($data);
        $settings->save();

        return back()->with('success', 'Configuración de puntos actualizada.');
    }

    public function storeReward(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'points_required' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $actor = $request->user();
        $adminId = $actor ? $this->resolvePointsAdminId($actor) : null;
        PointsReward::create([
            'admin_id' => $adminId,
            'name' => $data['name'],
            'points_required' => (int) $data['points_required'],
            'description' => $data['description'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return back()->with('success', 'Redención creada.');
    }

    public function updateReward(Request $request, PointsReward $reward)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'points_required' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $actor = $request->user();
        $adminId = $actor ? $this->resolvePointsAdminId($actor) : null;
        if ($reward->admin_id !== $adminId) {
            abort(403);
        }
        $reward->update([
            'name' => $data['name'],
            'points_required' => (int) $data['points_required'],
            'description' => $data['description'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return back()->with('success', 'Redención actualizada.');
    }

    public function destroyReward(PointsReward $reward)
    {
        $actor = request()->user();
        $adminId = $actor ? $this->resolvePointsAdminId($actor) : null;
        if ($reward->admin_id !== $adminId) {
            abort(403);
        }
        $reward->delete();
        return back()->with('success', 'Redención eliminada.');
    }
}
