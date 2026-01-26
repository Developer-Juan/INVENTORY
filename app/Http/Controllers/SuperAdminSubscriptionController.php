<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SuperAdminSubscriptionController extends Controller
{
    public function index()
    {
        $plans = SubscriptionPlan::orderBy('is_demo', 'desc')
            ->orderBy('duration_days')
            ->get();

        $admins = User::role('admin')
            ->with(['activeSubscription.plan'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status']);

        return Inertia::render('SuperAdmin/Subscriptions', [
            'plans' => $plans,
            'admins' => $admins,
        ]);
    }

    public function storePlan(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'badge_color' => ['nullable', 'string', 'max:30'],
            'is_demo' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $data['slug'] = Str::slug($data['name']);
        $data['price'] = $data['price'] ?? 0;
        $data['badge_color'] = $data['badge_color'] ?: 'indigo';
        $data['is_demo'] = (bool) ($data['is_demo'] ?? false);
        $data['is_active'] = (bool) ($data['is_active'] ?? true);

        SubscriptionPlan::create($data);

        return back()->with('success', 'Plan creado.');
    }

    public function updatePlan(Request $request, SubscriptionPlan $plan)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'badge_color' => ['nullable', 'string', 'max:30'],
            'is_demo' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $plan->fill([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'duration_days' => $data['duration_days'],
            'price' => $data['price'] ?? 0,
            'badge_color' => $data['badge_color'] ?: 'indigo',
            'is_demo' => (bool) ($data['is_demo'] ?? false),
            'is_active' => (bool) ($data['is_active'] ?? true),
        ])->save();

        return back()->with('success', 'Plan actualizado.');
    }

    public function assign(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'plan_id' => ['required', 'integer', 'exists:subscription_plans,id'],
            'starts_at' => ['nullable', 'date'],
        ]);

        $user = User::findOrFail($data['user_id']);
        $plan = SubscriptionPlan::findOrFail($data['plan_id']);
        if (!$user->hasRole('admin')) {
            return back()->with('error', 'Solo puedes asignar suscripciones a usuarios admin.');
        }
        if (!$plan->is_active) {
            return back()->with('error', 'El plan seleccionado no esta activo.');
        }

        $startsAt = $data['starts_at']
            ? Carbon::parse($data['starts_at'])->startOfDay()
            : now();
        $endsAt = $startsAt->copy()->addDays($plan->duration_days)->endOfDay();

        DB::transaction(function () use ($user, $plan, $startsAt, $endsAt, $request) {
            Subscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'canceled',
                    'canceled_at' => now(),
                ]);

            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'created_by' => $request->user()->id,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
            ]);

            $user->forceFill([
                'status' => $plan->is_demo
                    ? User::STATUS_ACTIVE_DEMO
                    : User::STATUS_ACTIVE_WORKING,
            ])->save();
        });

        return back()->with('success', 'Suscripcion asignada.');
    }

    public function cancel(Subscription $subscription)
    {
        $subscription->forceFill([
            'status' => 'canceled',
            'canceled_at' => now(),
        ])->save();

        if ($subscription->user) {
            $subscription->user->forceFill(['status' => User::STATUS_CANCELED])->save();
        }

        return back()->with('success', 'Suscripcion cancelada.');
    }
}


