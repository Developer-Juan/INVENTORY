import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Docs(props) {
    const [navScrolled, setNavScrolled] = useState(false);
    const scrollContainerRef = useRef(null);
    const appName = props.appName || 'App';
    const appUrl = props.appUrl || '';
    const description =
        'Documentacion operativa y roadmap del sitio. Accesos rapidos a consultas publicas, paneles internos y flujos clave.';
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
    const ogImage = `${appUrl}/og-cover.jpg`;

    const sectionIds = useMemo(() => ['intro', 'roadmap', 'planes', 'links', 'faq'], []);

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

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return undefined;
        const onScroll = () => setNavScrolled(container.scrollTop > 12);
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
            <Head title={`${appName} | Documentacion`}>
                <meta name="description" content={description} />
                <meta name="robots" content="index,follow,max-image-preview:large" />
                <link rel="canonical" href={`${appUrl}/docs`} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={appName} />
                <meta property="og:title" content={`${appName} | Documentacion`} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={`${appUrl}/docs`} />
                <meta property="og:image" content={ogImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${appName} | Documentacion`} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={ogImage} />
            </Head>

            <div ref={scrollContainerRef} className="docs-scroll relative bg-sand-50 text-ink-900">
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
                            <p className="font-display text-lg tracking-wide">{appName}</p>
                            <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Docs & Roadmap</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-6 text-sm font-semibold">
                        <button
                            type="button"
                            onClick={() => scrollToSection('roadmap')}
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                        >
                            Roadmap
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('links')}
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                        >
                            Accesos
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('faq')}
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                        >
                            FAQ
                        </button>
                        <Link
                            href="/"
                            className="rounded-full border border-ink-200 px-4 py-2 text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                        >
                            Volver
                        </Link>
                    </nav>
                </header>

                <main className="relative z-10">
                    <section
                        id="intro"
                        className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16"
                    >
                        <div className="space-y-6 reveal-on-nav">
                            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500 shadow-sm">
                                Centro de documentacion
                            </div>
                            <h1 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
                                Guia operativa y mapa del producto en un solo lugar.
                            </h1>
                            <p className="max-w-xl text-lg text-ink-600">
                                Encuentra flujos clave, acceso rapido a consultas publicas y el
                                roadmap del sitio. Todo con el mismo estilo visual de la landing.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    type="button"
                                    className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                    onClick={() => scrollToSection('roadmap')}
                                >
                                    Ver roadmap
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full border border-ink-300 px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                                    onClick={() => scrollToSection('links')}
                                >
                                    Ver accesos
                                </button>
                            </div>
                        </div>

                        <div className="relative reveal-on-nav">
                            <div className="absolute -right-6 top-6 hidden h-24 w-24 rounded-3xl bg-ink-900 opacity-10 blur-lg lg:block" />
                            <div className="space-y-4">
                                <div className="widget-card reveal-on-nav js-anime-card">
                                    <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Estado general</p>
                                    <p className="mt-3 font-display text-2xl">Operativo</p>
                                    <p className="text-sm text-ink-500">Servicios y consultas disponibles.</p>
                                </div>
                                <div className="widget-card reveal-on-nav js-anime-card">
                                    <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Version</p>
                                    <p className="mt-3 font-display text-2xl">v1.0</p>
                                    <p className="text-sm text-ink-500">Roadmap activo para el Q1.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="roadmap" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-16">
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div className="space-y-4 reveal-on-nav">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
                                    Roadmap del sitio
                                </p>
                                <h2 className="font-display text-3xl text-ink-900">
                                    De la consulta publica al panel interno.
                                </h2>
                                <p className="text-ink-600">
                                    Estas son las piezas clave para navegar el producto y entender los
                                    flujos principales del negocio.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {[
                                    { title: 'Consulta publica de puntos', text: 'Acceso para clientes sin login.' },
                                    { title: 'Soporte y tickets', text: 'Registro y trazabilidad de solicitudes.' },
                                    { title: 'Inventarios', text: 'Altas, minimos y ajustes de stock.' },
                                    { title: 'Ventas y pagos', text: 'Carrito, splits y cierres diarios.' },
                                    { title: 'Notificaciones por correo', text: 'Avisos para admins sobre tickets y ventas.' },
                                    { title: 'Calidad de servicio', text: 'Encuestas publicas con token.' },
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

                    <section id="planes" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-16">
                        <div className="space-y-6 reveal-on-nav">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">
                                    Planes disponibles
                                </p>
                                <h2 className="font-display text-3xl text-ink-900">
                                    Suscripciones flexibles para cada etapa.
                                </h2>
                                <p className="text-ink-600">
                                    Plan demo de 15 días y opciones mensuales, trimestrales o anuales para equipos en crecimiento.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-3">
                                {(plans.length
                                    ? plans
                                    : [
                                          { id: 'demo', name: 'Demo', duration_days: 15, price: 0, badge_color: 'indigo', is_demo: true },
                                          { id: 'trimestral', name: 'Trimestral', duration_days: 90, price: 0, badge_color: 'green' },
                                          { id: 'anual', name: 'Anual', duration_days: 365, price: 0, badge_color: 'amber' },
                                      ]
                                ).map((plan) => (
                                    <div
                                        key={plan.id || plan.name}
                                        className="group rounded-[26px] border border-ink-200 bg-white/90 p-6 shadow-[0_16px_40px_rgba(23,20,21,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(23,20,21,0.12)]"
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

                    <section id="links" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-16">
                        <div className="rounded-[32px] bg-ink-900 px-8 py-12 text-sand-50 reveal-on-nav js-anime-card">
                            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-4 reveal-on-nav">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                                        Accesos rapidos
                                    </p>
                                    <h2 className="font-display text-3xl">
                                        Links utiles para operar y consultar.
                                    </h2>
                                    <p className="text-sand-100">
                                        Los accesos publicos funcionan sin login. Los paneles internos
                                        requieren autenticacion.
                                    </p>
                                </div>
                                    <div className="space-y-3 reveal-on-nav js-anime-card">
                                    <Link
                                        href={route('points.public')}
                                        className="block rounded-3xl bg-sand-50-10 px-4 py-3 text-sm hover:bg-sand-50-20 transition"
                                    >
                                        Consulta publica de puntos
                                    </Link>
                                    <Link
                                        href={route('login')}
                                        className="block rounded-3xl bg-sand-50-10 px-4 py-3 text-sm hover:bg-sand-50-20 transition"
                                    >
                                        Ingresar al panel
                                    </Link>
                                    <Link
                                        href="/#demo"
                                        className="block rounded-3xl bg-sand-50-10 px-4 py-3 text-sm hover:bg-sand-50-20 transition"
                                    >
                                        Solicitar demo
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-24">
                        <div className="grid gap-8 md:grid-cols-2">
                            {[
                                {
                                    q: 'Como consulto puntos sin cuenta?',
                                    a: 'Usa el acceso publico en la seccion de links. Solo necesitas el telefono del cliente.',
                                },
                                {
                                    q: 'Donde registro un ticket?',
                                    a: 'Dentro del panel, entra a Soporte y crea un nuevo ticket con la solicitud.',
                                },
                                {
                                    q: 'Se envian correos por notificaciones?',
                                    a: 'Los admins reciben correos por nuevos tickets y ventas. Cada usuario puede desactivar el correo en su perfil.',
                                },
                                {
                                    q: 'Quien ve el roadmap?',
                                    a: 'Este apartado es publico y sirve como mapa general para el equipo.',
                                },
                                {
                                    q: 'Como solicito una demo?',
                                    a: 'Desde el home o el registro puedes solicitar una sesion guiada.',
                                },
                            ].map((item, index) => (
                                <div
                                    key={item.q}
                                    className="feature-card reveal-on-nav js-anime-card"
                                    style={{ transitionDelay: `${index * 0.08}s` }}
                                >
                                    <h3 className="font-display text-lg text-ink-900">{item.q}</h3>
                                    <p className="mt-2 text-sm text-ink-600">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                <footer className="relative z-10 border-t border-ink-200 px-6 py-8 text-center text-xs text-ink-500">
                    {appName} v{props.appVersion || '0.0.0'} (c) {new Date().getFullYear()} - Documentacion operativa.
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

                .docs-scroll {
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .docs-scroll::-webkit-scrollbar {
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
            `}</style>
        </>
    );
}
