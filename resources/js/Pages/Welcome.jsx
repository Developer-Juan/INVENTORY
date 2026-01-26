import { Link, Head, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Welcome(props) {
    const [navScrolled, setNavScrolled] = useState(false);
    const scrollContainerRef = useRef(null);
    const appName = props.appName || 'App';
    const appUrl = props.appUrl || '';
    const landingStats = props.landingStats || {};
    const inventoryStats = landingStats.inventory || {};
    const salesPeriod = landingStats.salesPeriod || {};
    const pointsStats = landingStats.points || {};
    const description =
        'Suite integral para inventario, ventas, puntos, soporte y calidad de servicio. Control en tiempo real, reportes claros y operacion sin fricciones.';
    const ogImage = `${appUrl}/og-cover.jpg`;

    const sectionIds = useMemo(() => ['hero', 'alcance', 'widgets', 'planes', 'demo'], []);
    const demoForm = useForm({
        name: '',
        email: '',
        locations: '',
        industry: '',
        focus: '',
        password: '',
        password_confirmation: '',
    });
    const plans = Array.isArray(props.plans) ? props.plans : [];
    const money = (value) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
            Number(value || 0)
        );
    const badgeClass = (color) => {
        const map = {
            indigo: 'bg-indigo-100 text-indigo-700',
            blue: 'bg-sky-100 text-sky-700',
            green: 'bg-emerald-100 text-emerald-700',
            amber: 'bg-amber-100 text-amber-700',
            red: 'bg-rose-100 text-rose-700',
            gray: 'bg-slate-100 text-slate-700',
        };
        return map[color] || map.indigo;
    };

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const headerOffset = 96;
        const container = scrollContainerRef.current;
        if (!container) return;
        const elementTop = el.getBoundingClientRect().top + container.scrollTop;
        const targetTop = Math.max(0, elementTop - headerOffset);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const scrollToRelativeSection = (direction) => {
        const targets = sectionIds
            .map((id) => document.getElementById(id))
            .filter(Boolean);
        if (!targets.length) return;
        const container = scrollContainerRef.current;
        if (!container) return;
        const top = container.scrollTop + 8;
        const positions = targets.map((el) => ({
            id: el.id,
            top: el.offsetTop,
        }));
        const currentIndex = positions.findIndex((item, index) => {
            const next = positions[index + 1];
            if (!next) return top >= item.top;
            return top >= item.top && top < next.top;
        });
        const nextIndex =
            direction === 'down'
                ? Math.min(positions.length - 1, currentIndex + 1)
                : Math.max(0, currentIndex - 1);
        const targetId = positions[nextIndex]?.id;
        if (targetId) {
            scrollToSection(targetId);
        }
    };

    const fmtMoneyCompact = (value) => {
        const v = Number(value ?? 0);
        if (!Number.isFinite(v)) return '0';
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
        return v.toFixed(0);
    };

    const fmtTime = (value) => {
        if (!value) return '--:--';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '--:--';
        return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return undefined;
        const onScroll = () => {
            setNavScrolled(container.scrollTop > 12);
        };
        onScroll();
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const elements = Array.from(document.querySelectorAll('.reveal-on-nav'));
        if (!elements.length) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.18 }
        );
        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);


    useEffect(() => {
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
        };
    }, []);

    return (
        <>
            <Head title={`${appName} | Control total de tu operacion`}>
                <meta name="description" content={description} />
                <meta name="robots" content="index,follow,max-image-preview:large" />
                <link rel="canonical" href={appUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={appName} />
                <meta property="og:title" content={`${appName} | Control total de tu operacion`} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={appUrl} />
                <meta property="og:image" content={ogImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${appName} | Control total de tu operacion`} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={ogImage} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'SoftwareApplication',
                            name: appName,
                            url: appUrl,
                            applicationCategory: 'BusinessApplication',
                            operatingSystem: 'Web',
                            description,
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'USD',
                            },
                        }),
                    }}
                />
            </Head>
            <div ref={scrollContainerRef} className="welcome-scroll relative bg-sand-50 text-ink-900">
                <div className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-aurora-1 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-40 -left-10 h-[520px] w-[520px] rounded-full bg-aurora-2 blur-[140px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-70" />

                <header
                    className={`sticky top-0 z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 transition-all duration-300 ${
                        navScrolled
                            ? 'navbar-scrolled shadow-[0_18px_50px_rgba(23,20,21,0.12)]'
                            : 'navbar-top'
                    }`}
                >
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
                        <Link
                            href={route('docs')}
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                        >
                            Documentacion
                        </Link>
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
                                <button
                                    type="button"
                                    className="rounded-full bg-ink-900 px-4 py-2 text-sand-50 transition hover:-translate-y-0.5 hover:shadow-lg"
                                    onClick={() => scrollToSection('demo')}
                                >
                                    Empezar
                                </button>
                            </div>
                        )}
                    </nav>
                </header>

                <main className="relative z-10">
                    <div className="arrow-nav">
                        <button
                            type="button"
                            className="arrow-btn"
                            aria-label="Ir arriba"
                            onClick={() => scrollToRelativeSection('up')}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className="arrow-btn"
                            aria-label="Ir abajo"
                            onClick={() => scrollToRelativeSection('down')}
                        >
                            ↓
                        </button>
                    </div>
                    <section
                        id="hero"
                        className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16"
                    >
                        <div className="space-y-6 reveal-on-nav">
                            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500 shadow-sm">
                                Plataforma todo en uno
                            </div>
                            <h1 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
                                Control total de inventario, ventas y puntos con una experiencia que enamora.
                            </h1>
                            <p className="max-w-xl text-lg text-ink-600">
                                {appName} centraliza tu operacion: inventarios en tiempo real, ventas con carrito,
                                transferencias entre sedes, tickets de soporte, calidad de servicio y programas de puntos.
                                Todo sincronizado, visual y listo para escalar.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    type="button"
                                    className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                    onClick={() => scrollToSection('demo')}
                                >
                                    Solicitar demo
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full border border-ink-300 px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                                    onClick={() => scrollToSection('alcance')}
                                >
                                    Ver alcance
                                </button>
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

                        <div className="relative reveal-on-nav">
                            <div className="absolute -right-6 top-6 hidden h-24 w-24 rounded-3xl bg-ink-900 opacity-10 blur-lg lg:block" />
                            <div className="relative space-y-4">
                                <div className="widget-card widget-float-1 reveal-on-nav js-anime-card">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Inventario en vivo
                                        </p>
                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            +{inventoryStats.healthy_pct ?? 0}%
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-3xl">
                                        {Number(inventoryStats.active_skus ?? 0).toLocaleString('es-CO')}
                                    </p>
                                    <p className="text-sm text-ink-500">
                                        SKU activos - alertas minimas {Number(inventoryStats.low_stock ?? 0).toLocaleString('es-CO')}
                                    </p>
                                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-200">
                                        <div
                                            className="h-full rounded-full bg-ink-900 transition-all duration-700"
                                            style={{
                                                width: `${Math.max(8, Math.min(100, inventoryStats.healthy_pct ?? 0))}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="widget-card widget-float-2 reveal-on-nav js-anime-card">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Ventas últimos {salesPeriod.days ?? 15} días
                                        </p>
                                        <span className="text-xs font-semibold text-ink-700">
                                            {fmtTime(salesPeriod.last_at)}
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-3xl">
                                        ${fmtMoneyCompact(salesPeriod.sum)}
                                    </p>
                                    <div className="mt-3 flex items-center gap-3 text-sm text-ink-500">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {Number(salesPeriod.count ?? 0).toLocaleString('es-CO')} ventas completadas
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <span className="h-3 w-10 rounded-full bg-ink-200" />
                                        <span className="h-3 w-16 rounded-full bg-ink-900 opacity-80" />
                                        <span className="h-3 w-6 rounded-full bg-ink-300" />
                                        <span className="h-3 w-12 rounded-full bg-ink-900 opacity-60" />
                                    </div>
                                </div>

                                <div className="widget-card widget-float-3 reveal-on-nav js-anime-card">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                            Puntos y fidelizacion
                                        </p>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                            {Number(pointsStats.redeems ?? 0).toLocaleString('es-CO')} canjes
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-2xl">Programa activo</p>
                                    <p className="text-sm text-ink-500">
                                        {Number(pointsStats.customers ?? 0).toLocaleString('es-CO')} clientes con puntos.
                                    </p>
                                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-ink-600">
                                        <div className="rounded-2xl bg-ink-100 p-3">Gold</div>
                                        <div className="rounded-2xl bg-ink-100 p-3">Silver</div>
                                        <div className="rounded-2xl bg-ink-100 p-3">Bronze</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="alcance" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-20">
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div className="space-y-4 reveal-on-nav">
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
                                ].map((item, index) => (
                                    <div
                                        key={item.title}
                                        className="feature-card reveal-on-nav js-anime-card"
                                        style={{ transitionDelay: `${index * 0.08}s` }}
                                    >
                                        <h3 className="font-display text-lg text-ink-900">{item.title}</h3>
                                        <p className="mt-2 text-sm text-ink-600">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="widgets" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-20">
                        <div className="rounded-[32px] bg-ink-900 px-8 py-12 text-sand-50 reveal-on-nav js-anime-card">
                            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-4 reveal-on-nav">
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
                                    <div className="rounded-3xl bg-sand-50-10 p-6 reveal-on-nav js-anime-card">
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
                                    <div className="rounded-3xl bg-sand-50-10 p-6 reveal-on-nav js-anime-card">
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

                    <section id="planes" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-20">
                        <div className="space-y-6 reveal-on-nav">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
                                    Planes y suscripciones
                                </p>
                                <h2 className="font-display text-3xl text-ink-900">
                                    Elige el plan que acompaña tu crecimiento.
                                </h2>
                                <p className="text-ink-600">
                                    Opciones flexibles para demo, mensual, trimestral o anual. Cambia de plan cuando lo necesites.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                {(plans.length
                                    ? plans
                                    : [
                                          { id: 'demo', name: 'Demo', duration_days: 15, price: 0, badge_color: 'indigo', is_demo: true },
                                          { id: 'mensual', name: 'Mensual', duration_days: 30, price: 0, badge_color: 'green' },
                                          { id: 'anual', name: 'Anual', duration_days: 365, price: 0, badge_color: 'amber' },
                                      ]
                                ).map((plan) => (
                                    <div
                                        key={plan.id || plan.name}
                                        className="group rounded-[28px] border border-ink-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(23,20,21,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(23,20,21,0.12)]"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass(plan.badge_color)}`}>
                                                {plan.name}
                                            </span>
                                            {plan.is_demo && (
                                                <span className="text-xs uppercase tracking-[0.2em] text-ink-400">Demo</span>
                                            )}
                                        </div>
                                        <div className="mt-5 space-y-2">
                                            <p className="text-sm uppercase tracking-[0.25em] text-ink-400">Desde</p>
                                            <p className="font-display text-3xl text-ink-900">
                                                {Number(plan.price || 0) > 0 ? money(plan.price) : 'A convenir'}
                                            </p>
                                            <p className="text-sm text-ink-600">
                                                {plan.duration_days} días de acceso completo
                                            </p>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between">
                                            <span className="text-xs text-ink-500">
                                                Soporte y actualizaciones incluidas
                                            </span>
                                            <span className="text-xs font-semibold text-ink-700">
                                                {plan.duration_days >= 365 ? 'Premium' : 'Flexible'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-5 w-full rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-700 transition group-hover:border-ink-900 group-hover:text-ink-900"
                                        >
                                            Ver detalles
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-24">
                        <div className="grid gap-10 rounded-[32px] border border-ink-200 bg-sand-50 px-8 py-12 lg:grid-cols-[1fr_0.9fr] reveal-on-nav js-anime-card">
                            <div className="space-y-4 reveal-on-nav">
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
                            <form
                                className="space-y-4 reveal-on-nav js-anime-card"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (demoForm.processing) return;
                                    demoForm.post(route('demo-requests.store'), {
                                        preserveScroll: true,
                                        onSuccess: () => demoForm.reset(),
                                    });
                                }}
                            >
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre y apellido"
                                        className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                        value={demoForm.data.name}
                                        onChange={(e) => demoForm.setData('name', e.target.value)}
                                    />
                                    {demoForm.errors.name && (
                                        <p className="mt-1 text-xs text-red-600">{demoForm.errors.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Correo corporativo
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="tu@empresa.com"
                                        className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                        value={demoForm.data.email}
                                        onChange={(e) => demoForm.setData('email', e.target.value)}
                                    />
                                    {demoForm.errors.email && (
                                        <p className="mt-1 text-xs text-red-600">{demoForm.errors.email}</p>
                                    )}
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
                                            value={demoForm.data.locations}
                                            onChange={(e) => demoForm.setData('locations', e.target.value)}
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
                                            value={demoForm.data.industry}
                                            onChange={(e) => demoForm.setData('industry', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                            Contrasena
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Crea una clave"
                                            className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                            value={demoForm.data.password}
                                            onChange={(e) => demoForm.setData('password', e.target.value)}
                                        />
                                        {demoForm.errors.password && (
                                            <p className="mt-1 text-xs text-red-600">{demoForm.errors.password}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                            Confirmar
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Confirma la clave"
                                            className="mt-2 w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
                                            value={demoForm.data.password_confirmation}
                                            onChange={(e) => demoForm.setData('password_confirmation', e.target.value)}
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
                                        value={demoForm.data.focus}
                                        onChange={(e) => demoForm.setData('focus', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                    disabled={demoForm.processing}
                                >
                                    {demoForm.processing ? 'Enviando...' : 'Agendar demo'}
                                </button>
                                <p className="text-xs text-ink-500">
                                    Respuesta en menos de 24 horas habiles.
                                </p>
                            </form>
                        </div>
                    </section>
                </main>

                <footer className="relative z-10 border-t border-ink-200 px-6 py-8 text-center text-xs text-ink-500">
                    {props.appName || 'App'} v{props.appVersion || '0.0.0'} (c) {new Date().getFullYear()} - Operacion clara, clientes felices.
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

                html {
                    scroll-behavior: smooth;
                }

                .welcome-scroll {
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .welcome-scroll::-webkit-scrollbar {
                    width: 0;
                    height: 0;
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

                .navbar-top {
                    background: rgba(248, 245, 240, 0.6);
                    border-radius: 999px;
                    border: 1px solid rgba(207, 199, 195, 0.3);
                    margin-top: 12px;
                }

                .navbar-scrolled {
                    background: rgba(248, 245, 240, 0.92);
                    border-radius: 22px;
                    border: 1px solid rgba(23, 20, 21, 0.08);
                    margin-top: 0;
                }

                .arrow-nav {
                    position: fixed;
                    right: 24px;
                    bottom: 32px;
                    z-index: 40;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .arrow-btn {
                    height: 46px;
                    width: 46px;
                    border-radius: 16px;
                    border: 1px solid rgba(23, 20, 21, 0.15);
                    background: rgba(248, 245, 240, 0.85);
                    color: var(--ink-700);
                    font-size: 20px;
                    display: grid;
                    place-items: center;
                    transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
                    animation: float 5s ease-in-out infinite;
                }

                .arrow-btn:hover {
                    transform: translateY(-2px);
                    background: rgba(248, 245, 240, 0.98);
                    box-shadow: 0 18px 40px rgba(23, 20, 21, 0.16);
                }

                .arrow-btn:nth-child(2) {
                    animation-delay: 0.6s;
                }

                .reveal-on-nav {
                    opacity: 0;
                    transform: translateY(24px) scale(0.98);
                    transition: opacity 0.7s ease, transform 0.7s ease;
                    will-change: transform, opacity;
                }

                .reveal-on-nav.is-visible {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                @media (max-width: 900px) {
                    .arrow-nav {
                        right: 12px;
                    }
                }

                @media (max-width: 720px) {
                    .arrow-nav {
                        right: 12px;
                        bottom: 20px;
                    }
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
