import { Link, Head } from '@inertiajs/react';

export default function Welcome(props) {
    return (
        <>
            <Head title={`${props.appName || 'App'} | Control total de tu operacion`} />
            <div className="relative overflow-hidden bg-sand-50 text-ink-900">
                <div className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-aurora-1 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-40 -left-10 h-[520px] w-[520px] rounded-full bg-aurora-2 blur-[140px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-70" />

                <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-sand-50">
                            <span className="font-display text-lg">DM</span>
                        </div>
                        <div>
                            <p className="font-display text-lg tracking-wide">{props.appName || 'App'}</p>
                            <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Operations Suite</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-6 text-sm font-semibold">
                        <a href="#alcance" className="hidden text-ink-600 hover:text-ink-900 md:inline">
                            Alcance
                        </a>
                        <a href="#widgets" className="hidden text-ink-600 hover:text-ink-900 md:inline">
                            Widgets
                        </a>
                        <a href="#demo" className="hidden text-ink-600 hover:text-ink-900 md:inline">
                            Demo
                        </a>
                        {props.auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-full border border-ink-200 px-4 py-2 text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    href={route('login')}
                                    className="text-ink-600 hover:text-ink-900"
                                >
                                    Ingresar
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-full bg-ink-900 px-4 py-2 text-sand-50 transition hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    Empezar
                                </Link>
                            </div>
                        )}
                    </nav>
                </header>

                <main className="relative z-10">
                    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500 shadow-sm">
                                Plataforma todo en uno
                            </div>
                            <h1 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
                                Control total de inventario, ventas y puntos con una experiencia que enamora.
                            </h1>
                            <p className="max-w-xl text-lg text-ink-600">
                                DealerMania centraliza tu operacion: inventarios en tiempo real, ventas con carrito,
                                transferencias entre sedes, tickets de soporte, calidad de servicio y programas de puntos.
                                Todo sincronizado, visual y listo para escalar.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <a
                                    href="#demo"
                                    className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                >
                                    Solicitar demo
                                </a>
                                <a
                                    href="#alcance"
                                    className="rounded-full border border-ink-300 px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                                >
                                    Ver alcance
                                </a>
                            </div>
                            <div className="flex flex-wrap gap-6 pt-4 text-sm text-ink-500">
                                <div>
                                    <p className="font-display text-2xl text-ink-900">+35%</p>
                                    <p>Rotacion de stock</p>
                                </div>
                                <div>
                                    <p className="font-display text-2xl text-ink-900">-22%</p>
                                    <p>Errores de caja</p>
                                </div>
                                <div>
                                    <p className="font-display text-2xl text-ink-900">24/7</p>
                                    <p>Monitoreo operativo</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -right-6 top-6 hidden h-24 w-24 rounded-3xl bg-ink-900 opacity-10 blur-lg lg:block" />
                            <div className="relative space-y-4">
                                <div className="widget-card widget-float-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Inventario en vivo
                                        </p>
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            +12%
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-3xl">1,284</p>
                                    <p className="text-sm text-ink-500">SKU activos - alertas minimas 4</p>
                                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-200">
                                        <div className="h-full w-3/4 rounded-full bg-ink-900 animate-progress" />
                                    </div>
                                </div>

                                <div className="widget-card widget-float-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Ventas hoy
                                        </p>
                                        <span className="text-xs font-semibold text-ink-700">07:35 PM</span>
                                    </div>
                                    <p className="mt-4 font-display text-3xl">$8.9M</p>
                                    <div className="mt-3 flex items-center gap-3 text-sm text-ink-500">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        18 ventas completadas
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <span className="h-3 w-10 rounded-full bg-ink-200" />
                                        <span className="h-3 w-16 rounded-full bg-ink-900 opacity-80" />
                                        <span className="h-3 w-6 rounded-full bg-ink-300" />
                                        <span className="h-3 w-12 rounded-full bg-ink-900 opacity-60" />
                                    </div>
                                </div>

                                <div className="widget-card widget-float-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Puntos y fidelizacion
                                        </p>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                            312 canjes
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-2xl">Programa activo</p>
                                    <p className="text-sm text-ink-500">Recompensas, regalos y campanas.</p>
                                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-ink-600">
                                        <div className="rounded-2xl bg-ink-100 p-3">Gold</div>
                                        <div className="rounded-2xl bg-ink-100 p-3">Silver</div>
                                        <div className="rounded-2xl bg-ink-100 p-3">Bronze</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="alcance" className="mx-auto w-full max-w-6xl px-6 pb-20">
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
                                    Alcance total
                                </p>
                                <h2 className="font-display text-3xl text-ink-900">
                                    Una suite para toda la operacion, desde la caja hasta la satisfaccion del cliente.
                                </h2>
                                <p className="text-ink-600">
                                    Automatiza tareas criticas, reduce perdidas y logra una vision compartida entre ventas,
                                    inventario, soporte y administracion.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {[
                                    {
                                        title: 'Ventas con carrito',
                                        text: 'Pagos divididos, entregas y cancelaciones controladas.',
                                    },
                                    {
                                        title: 'Transferencias entre sedes',
                                        text: 'Trazabilidad total y ajustes en tiempo real.',
                                    },
                                    {
                                        title: 'Calidad de servicio',
                                        text: 'Encuestas publicas con token y panel de analisis.',
                                    },
                                    {
                                        title: 'Soporte & notificaciones',
                                        text: 'Tickets internos y anuncios a distribuidores.',
                                    },
                                    {
                                        title: 'Programa de puntos',
                                        text: 'Consultas publicas, rewards y regalos por cliente.',
                                    },
                                    {
                                        title: 'Stock inteligente',
                                        text: 'Alertas de minimos, resumen de inventario y balance.',
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="feature-card">
                                        <h3 className="font-display text-lg text-ink-900">{item.title}</h3>
                                        <p className="mt-2 text-sm text-ink-600">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="widgets" className="mx-auto w-full max-w-6xl px-6 pb-20">
                        <div className="rounded-[32px] bg-ink-900 px-8 py-12 text-sand-50">
                            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                                        Widgets animados
                                    </p>
                                    <h2 className="font-display text-3xl">
                                        Paneles vivos que cuentan la historia de tu operacion.
                                    </h2>
                                    <p className="text-sand-100">
                                        Dashboards con movimiento sutil, metricas que destacan tendencias y alertas
                                        predictivas para anticiparte a la demanda.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em]">
                                        <span className="rounded-full border border-sand-200-30 px-3 py-2">Realtime</span>
                                        <span className="rounded-full border border-sand-200-30 px-3 py-2">Split payments</span>
                                        <span className="rounded-full border border-sand-200-30 px-3 py-2">KPI alerts</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="rounded-3xl bg-sand-50-10 p-6">
                                        <p className="text-xs uppercase tracking-[0.3em] text-sand-200">
                                            Radar operacional
                                        </p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-3xl font-display">92%</span>
                                            <span className="text-xs text-emerald-200">salud operativa</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-5 gap-2">
                                            {[...Array(5)].map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className="h-2 rounded-full bg-sand-200-20"
                                                >
                                                    <div
                                                        className="h-full rounded-full bg-emerald-300 animate-spark"
                                                        style={{ animationDelay: `${idx * 0.3}s` }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-3xl bg-sand-50-10 p-6">
                                        <p className="text-xs uppercase tracking-[0.3em] text-sand-200">Clientes</p>
                                        <div className="mt-4 flex items-center justify-between text-sm">
                                            <span>Recurrencia</span>
                                            <span className="text-amber-200">+18%</span>
                                        </div>
                                        <div className="mt-4 flex gap-3">
                                            <span className="h-10 w-10 rounded-full bg-sand-50-20" />
                                            <span className="h-10 w-10 rounded-full bg-sand-50-20" />
                                            <span className="h-10 w-10 rounded-full bg-sand-50-20" />
                                            <span className="h-10 w-10 rounded-full bg-amber-200/80" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="demo" className="mx-auto w-full max-w-6xl px-6 pb-24">
                        <div className="grid gap-10 rounded-[32px] border border-ink-200 bg-sand-50 px-8 py-12 lg:grid-cols-[1fr_0.9fr]">
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
                                    Solicita un demo
                                </p>
                                <h2 className="font-display text-3xl text-ink-900">
                                    Te mostramos todo el alcance de {props.appName || 'App'} en una sesion guiada.
                                </h2>
                                <p className="text-ink-600">
                                    Cuentanos sobre tu operacion y armamos una demo personalizada con flujos de ventas,
                                    inventarios, puntos y calidad de servicio.
                                </p>
                                <div className="rounded-3xl bg-ink-900 p-6 text-sand-50">
                                    <p className="font-display text-xl">Listo para empezar?</p>
                                    <p className="mt-2 text-sm text-sand-100">
                                        Integracion rapida, acompanamiento y soporte premium.
                                    </p>
                                </div>
                            </div>
                            <form className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre y apellido"
                                        className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Correo corporativo
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="tu@empresa.com"
                                        className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                    />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                            Sedes
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 3"
                                            className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                            Industria
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Retail, gastronomia, etc."
                                            className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Que quieres optimizar?
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="Inventarios, ventas, puntos, soporte..."
                                        className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="w-full rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                >
                                    Agendar demo
                                </button>
                                <p className="text-xs text-ink-500">
                                    Respuesta en menos de 24 horas habiles.
                                </p>
                            </form>
                        </div>
                    </section>
                </main>

                <footer className="relative z-10 border-t border-ink-200 px-6 py-8 text-center text-xs text-ink-500">
                    {props.appName || 'App'} (c) {new Date().getFullYear()} - Operacion clara, clientes felices.
                    <span className="ml-2 text-ink-400">
                        Laravel v{props.laravelVersion} (PHP v{props.phpVersion})
                    </span>
                </footer>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

                :root {
                    --sand-50: #f8f5f0;
                    --ink-900: #171415;
                    --ink-700: #2e2a2c;
                    --ink-600: #4b4649;
                    --ink-500: #6a6468;
                    --ink-300: #cfc7c3;
                    --ink-200: #e5ded8;
                    --aurora-1: #ffe4b5;
                    --aurora-2: #e3d1ff;
                }

                .font-display {
                    font-family: 'Clash Display', 'Plus Jakarta Sans', sans-serif;
                }

                body {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }

                .bg-sand-50 {
                    background-color: var(--sand-50);
                }

                .text-ink-900 {
                    color: var(--ink-900);
                }

                .text-ink-700 {
                    color: var(--ink-700);
                }

                .text-ink-600 {
                    color: var(--ink-600);
                }

                .text-ink-500 {
                    color: var(--ink-500);
                }

                .text-ink-400 {
                    color: var(--ink-300);
                }

                .border-ink-200 {
                    border-color: var(--ink-200);
                }

                .border-ink-300 {
                    border-color: var(--ink-300);
                }

                .bg-ink-900 {
                    background-color: var(--ink-900);
                }

                .bg-ink-100 {
                    background-color: #efe9e6;
                }

                .bg-aurora-1 {
                    background-color: var(--aurora-1);
                }

                .bg-aurora-2 {
                    background-color: var(--aurora-2);
                }

                .bg-grid-pattern {
                    background-image: radial-gradient(circle at 1px 1px, rgba(23, 20, 21, 0.08) 1px, transparent 0);
                    background-size: 28px 28px;
                }

                .text-sand-50 {
                    color: #fef9f5;
                }

                .text-sand-100 {
                    color: #f4eee8;
                }

                .text-sand-200 {
                    color: #e7ded6;
                }

                .bg-sand-50-10 {
                    background-color: rgba(248, 245, 240, 0.1);
                }

                .bg-sand-50-20 {
                    background-color: rgba(248, 245, 240, 0.2);
                }

                .bg-sand-200-20 {
                    background-color: rgba(207, 199, 195, 0.2);
                }

                .border-sand-200-30 {
                    border-color: rgba(207, 199, 195, 0.3);
                }

                .widget-card {
                    border-radius: 32px;
                    border: 1px solid var(--ink-200);
                    background: rgba(255, 255, 255, 0.85);
                    padding: 24px;
                    backdrop-filter: blur(14px);
                    box-shadow: 0 20px 60px rgba(23, 20, 21, 0.12);
                }

                .feature-card {
                    border-radius: 24px;
                    border: 1px solid var(--ink-200);
                    background: #fff;
                    padding: 20px;
                    box-shadow: 0 12px 30px rgba(23, 20, 21, 0.08);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                .feature-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 18px 40px rgba(23, 20, 21, 0.12);
                }

                .widget-float-1 {
                    animation: float 6s ease-in-out infinite;
                }

                .widget-float-2 {
                    animation: float 7s ease-in-out infinite;
                }

                .widget-float-3 {
                    animation: float 8s ease-in-out infinite;
                }

                .animate-progress {
                    animation: progress 2.6s ease-in-out infinite;
                }

                .animate-spark {
                    width: 100%;
                    animation: spark 2.4s ease-in-out infinite;
                }

                @keyframes float {
                    0%,
                    100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes progress {
                    0% {
                        width: 20%;
                    }
                    50% {
                        width: 78%;
                    }
                    100% {
                        width: 60%;
                    }
                }

                @keyframes spark {
                    0% {
                        width: 10%;
                        opacity: 0.4;
                    }
                    50% {
                        width: 80%;
                        opacity: 1;
                    }
                    100% {
                        width: 30%;
                        opacity: 0.6;
                    }
                }
            `}</style>
        </>
    );
}



