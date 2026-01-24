<?php

namespace App\Http\Controllers;

use App\Models\CustomerPoint;
use App\Models\PointsReward;
use App\Models\PointsSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class PointsController extends Controller
{
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
            return response()->json(['found' => false]);
        }

        $points = CustomerPoint::firstOrCreate(
            ['user_id' => $user->id],
            ['points_balance' => 0]
        );

        return response()->json([
            'found' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'points_balance' => (int) $points->points_balance,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $settings = PointsSetting::first() ?? PointsSetting::create([
            'value_per_point' => 0,
            'redemption_info' => null,
        ]);

        $rewards = PointsReward::orderBy('points_required')->get();
        $user = auth()->user();
        $roles = $user ? $user->getRoleNames() : collect();
        $isAdmin = $roles->contains('admin') || $roles->contains('super-admin');
        $search = trim((string) $request->get('q', ''));
        $pointsUsers = [];
        if ($isAdmin) {
            $pointsUsers = CustomerPoint::with(['user:id,name,phone,email'])
                ->select('id', 'user_id', 'points_balance')
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

        $settings = PointsSetting::first() ?? new PointsSetting();
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

        PointsReward::create([
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
        $reward->delete();
        return back()->with('success', 'Redención eliminada.');
    }
}
