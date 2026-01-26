<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PENDING_DEMO = 'pending_demo';
    public const STATUS_ACTIVE_DEMO = 'active_demo';
    public const STATUS_ACTIVE_WORKING = 'active_working';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELED = 'canceled';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'created_by',
        'location_id',
        'status',
        'last_seen_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'mail_notifications_enabled' => 'boolean',
    ];

    protected $guarded = [];

    public function location()
    {
        // locations.user_id -> users.id
        return $this->hasOne(Location::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function createdUsers()
    {
        return $this->hasMany(User::class, 'created_by');
    }

    public function customerPoints()
    {
        return $this->hasOne(CustomerPoint::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)
            ->where('status', 'active')
            ->latest('ends_at');
    }

    public function isActiveForLogin(): bool
    {
        if ($this->hasRole('super-admin')) {
            return true;
        }

        return in_array($this->status, [
            self::STATUS_ACTIVE_DEMO,
            self::STATUS_ACTIVE_WORKING,
        ], true);
    }
}
