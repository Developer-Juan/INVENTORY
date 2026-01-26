import React, { useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const StatCard = ({ title, value, hint, delay = 0 }) => (
    <div
        className="stat-card rounded-2xl bg-[#0f172a] text-white shadow-lg shadow-black/30 p-5"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="text-sm text-slate-300">{title}</div>
        <div className="mt-2 text-3xl font-semibold stat-number">{value}</div>
        {hint && <div className="mt-2 text-xs text-slate-400">{hint}</div>}
    </div>
);

const Bar = ({ label, value, max, tone, delay = 0 }) => {
    const percent = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="space-y-2 bar-row" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{label}</span>
                <span>{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
                <div
                    className={`h-full rounded-full ${tone} bar-fill`}
                    style={{ ['--bar-width']: `${percent}%` }}
                />
            </div>
        </div>
    );
};

export default function SuperAdminDashboard() {
    const { auth, stats = {} } = usePage().props;
    const total = stats.total ?? 0;
    const pending = stats.pending ?? 0;
    const activeDemo = stats.active_demo ?? 0;
    const activeWorking = stats.active_working ?? 0;
    const online = stats.online ?? 0;
    const maxBar = Math.max(total, pending, activeDemo, activeWorking, 1);
    const statCards = useMemo(() => ([
        { title: 'Usuarios totales', value: total, hint: 'Registro global' },
        { title: 'Pendientes', value: pending, hint: 'Esperando aprobacion' },
        { title: 'Activos demo', value: activeDemo, hint: 'Cuentas en prueba' },
        { title: 'Activos working', value: activeWorking, hint: 'Clientes activos' },
        { title: 'En linea (5 min)', value: online, hint: 'Actividad reciente' },
    ]), [total, pending, activeDemo, activeWorking, online]);

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Super Admin</h2>}
        >
            <Head title="Super Admin" />
            <div className="py-6">
                <div className="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {statCards.map((card, idx) => (
                            <StatCard
                                key={card.title}
                                title={card.title}
                                value={card.value}
                                hint={card.hint}
                                delay={idx * 120}
                            />
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                        <div className="rounded-2xl bg-[#0b1220] p-6 text-white shadow-lg shadow-black/30 card-glow">
                            <div className="text-sm text-slate-300">Distribucion de estados</div>
                            <div className="mt-4 space-y-4">
                                <Bar label="Pendientes" value={pending} max={maxBar} tone="bg-amber-400" delay={0} />
                                <Bar label="Activos demo" value={activeDemo} max={maxBar} tone="bg-sky-400" delay={120} />
                                <Bar label="Activos working" value={activeWorking} max={maxBar} tone="bg-emerald-400" delay={240} />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[#0b1220] p-6 text-white shadow-lg shadow-black/30 card-glow">
                            <div className="text-sm text-slate-300">Actividad</div>
                            <div className="mt-6">
                                <div className="text-4xl font-semibold stat-number">{online}</div>
                                <div className="text-xs text-slate-400 mt-1">Usuarios en linea</div>
                                <div className="mt-6 h-24 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.35),transparent_55%)]" />
                                    <div className="absolute -left-10 top-8 h-16 w-16 rounded-full bg-sky-400/30 blur-2xl pulse-blob" />
                                    <div className="absolute right-4 bottom-6 h-20 w-20 rounded-full bg-emerald-400/30 blur-2xl pulse-blob delay-blob" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .stat-card {
                    animation: card-fade 0.6s ease both;
                }

                .stat-number {
                    animation: count-glow 1.6s ease-in-out infinite;
                }

                .bar-row {
                    animation: card-fade 0.6s ease both;
                }

                .bar-fill {
                    width: var(--bar-width);
                    animation: bar-grow 1.2s ease both;
                }

                .card-glow {
                    position: relative;
                    overflow: hidden;
                }

                .card-glow::after {
                    content: '';
                    position: absolute;
                    inset: -40% -20% auto -20%;
                    height: 140px;
                    background: radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.15), transparent 60%);
                    opacity: 0.9;
                    animation: glow-pan 10s ease-in-out infinite;
                }

                .pulse-blob {
                    animation: blob-pulse 3.6s ease-in-out infinite;
                }

                .delay-blob {
                    animation-delay: 1.2s;
                }

                @keyframes card-fade {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes bar-grow {
                    from {
                        width: 0%;
                    }
                    to {
                        width: var(--bar-width);
                    }
                }

                @keyframes glow-pan {
                    0% {
                        transform: translateX(-10%);
                        opacity: 0.6;
                    }
                    50% {
                        transform: translateX(10%);
                        opacity: 0.9;
                    }
                    100% {
                        transform: translateX(-10%);
                        opacity: 0.6;
                    }
                }

                @keyframes blob-pulse {
                    0%, 100% {
                        transform: scale(0.9);
                        opacity: 0.5;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.9;
                    }
                }

                @keyframes count-glow {
                    0%, 100% {
                        text-shadow: 0 0 0 rgba(56, 189, 248, 0.0);
                    }
                    50% {
                        text-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
