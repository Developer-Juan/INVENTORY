// resources/js/Pages/Points/PublicLookup.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function PublicLookup(props) {
    const [navScrolled, setNavScrolled] = useState(false);
    const scrollContainerRef = useRef(null);
    const initialOverflowRef = useRef({ html: '', body: '' });
    const [isZoomed, setIsZoomed] = useState(false);

    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const appName = props?.appName || 'App';
    const appUrl = props?.appUrl || '';
    const description = 'Consulta pública de puntos: revisa tu saldo en segundos.';
    const ogImage = `${appUrl}/og-cover.jpg`;

    const sectionIds = useMemo(() => ['hero', 'consulta', 'resultado'], []);

    const normalizePhone = (value) => String(value ?? '').replace(/\D+/g, '');

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const headerOffset = 96;
        const container = scrollContainerRef.current;
        const useWindowScroll = isZoomed || !container;
        const elementTop = el.getBoundingClientRect().top + (useWindowScroll ? window.scrollY : container.scrollTop);
        const targetTop = Math.max(0, elementTop - headerOffset);
        if (useWindowScroll) {
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
            return;
        }
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const scrollToRelativeSection = (direction) => {
        const targets = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
        if (!targets.length) return;
        const container = scrollContainerRef.current;
        const useWindowScroll = isZoomed || !container;

        const top = (useWindowScroll ? window.scrollY : container.scrollTop) + 8;
        const positions = targets.map((el) => ({ id: el.id, top: el.offsetTop }));

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
        if (targetId) scrollToSection(targetId);
    };

    async function submit(e) {
        e.preventDefault();

        const normalized = normalizePhone(phone);
        if (normalized.length < 7 || normalized.length > 15) {
            setError('Ingresa un número válido (7–15 dígitos).');
            setResult(null);
            return;
        }

        setError('');
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(route('points.public.lookup', { phone: normalized }), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();

            if (!data?.found) {
                setResult({ found: false });
                requestAnimationFrame(() => scrollToSection('resultado'));
                return;
            }

            setResult({
                found: true,
                name: data.user?.name ?? '',
                phone: data.user?.phone ?? normalized,
                points: data.user?.points_balance ?? 0,
                breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
            });

            requestAnimationFrame(() => scrollToSection('resultado'));
        } catch (e2) {
            console.error(e2);
            setError('No se pudo consultar en este momento.');
        } finally {
            setLoading(false);
        }
    }

    // ✅ iOS fix: al enfocar inputs dentro de un contenedor scrolleable, a veces pega saltos.
    // Forzamos a mantener la sección visible (sin pelear con el browser).
    const onPhoneFocus = () => {
        requestAnimationFrame(() => {
            // Asegura que el bloque "consulta" quede visible bajo el header sticky
            if (!isZoomed) scrollToSection('consulta');
        });
    };

    // Track viewport zoom (iOS pinch/auto-zoom) to avoid breaking custom scroll.
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return undefined;
        const onViewportChange = () => setIsZoomed(vv.scale > 1.01);
        onViewportChange();
        vv.addEventListener('resize', onViewportChange);
        vv.addEventListener('scroll', onViewportChange);
        return () => {
            vv.removeEventListener('resize', onViewportChange);
            vv.removeEventListener('scroll', onViewportChange);
        };
    }, []);

    // Welcome: lock scroll global (unless zoomed)
    useEffect(() => {
        if (!initialOverflowRef.current.html && !initialOverflowRef.current.body) {
            initialOverflowRef.current = {
                html: document.documentElement.style.overflow,
                body: document.body.style.overflow,
            };
        }
        if (isZoomed) {
            document.documentElement.style.overflow = initialOverflowRef.current.html;
            document.body.style.overflow = initialOverflowRef.current.body;
            return undefined;
        }
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = initialOverflowRef.current.html;
            document.body.style.overflow = initialOverflowRef.current.body;
        };
    }, [isZoomed]);

    // Welcome: sticky header changes on scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        const onScroll = () => {
            const top = isZoomed || !container ? window.scrollY : container.scrollTop;
            setNavScrolled(top > 12);
        };
        onScroll();
        if (isZoomed || !container) {
            window.addEventListener('scroll', onScroll, { passive: true });
            return () => window.removeEventListener('scroll', onScroll);
        }
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, [scrollContainerRef, isZoomed]);

    // Welcome: reveal on scroll
    useEffect(() => {
        const elements = Array.from(document.querySelectorAll('.reveal-on-nav'));
        if (!elements.length) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('is-visible');
                });
            },
            { threshold: 0.18 }
        );
        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const pill = (() => {
        if (loading) return { text: 'Consultando…', cls: 'bg-amber-100 text-amber-700' };
        if (result?.found === true) return { text: 'Encontrado', cls: 'bg-emerald-100 text-emerald-700' };
        if (result?.found === false) return { text: 'No encontrado', cls: 'bg-rose-100 text-rose-700' };
        return { text: 'Online', cls: 'bg-slate-100 text-slate-700' };
    })();

    const progressWidth = (() => {
        if (!result?.found) return '60%';
        const v = Number(result.points || 0);
        const pct = Math.max(8, Math.min(100, (v % 100) || 42));
        return `${pct}%`;
    })();

    return (
        <>
            <Head title={`${appName} | Consulta de puntos`}>
                <meta name="description" content={description} />
                <meta name="robots" content="index,follow,max-image-preview:large" />
                <link rel="canonical" href={`${appUrl}/puntos`} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={appName} />
                <meta property="og:title" content={`${appName} | Consulta de puntos`} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={`${appUrl}/puntos`} />
                <meta property="og:image" content={ogImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${appName} | Consulta de puntos`} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={ogImage} />
            </Head>

            <div
                ref={scrollContainerRef}
                className={`welcome-scroll relative bg-sand-50 text-ink-900 ${isZoomed ? 'is-zoomed' : ''}`}
            >
                {/* Aurora + grid */}
                <div className="pointer-events-none absolute -top-24 right-0 h-[520px] w-[520px] rounded-full bg-aurora-1 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-40 -left-10 h-[520px] w-[520px] rounded-full bg-aurora-2 blur-[140px]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-70" />

                {/* Header (Welcome) */}
                <header
                    className={`sticky top-0 z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 transition-all duration-300 ${navScrolled
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
                            <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Consulta de puntos</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-6 text-sm font-semibold">
                        <button
                            type="button"
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                            onClick={() => scrollToSection('consulta')}
                        >
                            Consultar
                        </button>
                        <button
                            type="button"
                            className="hidden text-ink-600 hover:text-ink-900 md:inline"
                            onClick={() => scrollToSection('resultado')}
                        >
                            Resultado
                        </button>

                        {props?.auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-full border border-ink-200 px-4 py-2 text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <span className={`rounded-full px-3 py-2 text-xs font-semibold ${pill.cls}`}>
                                    {pill.text}
                                </span>
                                <Link
                                    href="/"
                                    className="rounded-full border border-ink-200 px-4 py-2 text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                                >
                                    Volver
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Arrow nav (Welcome) */}
                <div className="arrow-nav">
                    <button
                        type="button"
                        className="arrow-btn"
                        aria-label="Ir arriba"
                        onClick={() => scrollToRelativeSection('up')}
                    >
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 19V5" />
                            <path d="M5 12l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="arrow-btn"
                        aria-label="Ir abajo"
                        onClick={() => scrollToRelativeSection('down')}
                    >
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 5v14" />
                            <path d="M5 12l7 7 7-7" />
                        </svg>
                    </button>
                </div>

                <main className="relative z-10">
                    {/* HERO */}
                    <section
                        id="hero"
                        className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16"
                    >
                        <div className="space-y-6 reveal-on-nav">
                            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-500 shadow-sm">
                                Consulta pública · 24/7
                            </div>

                            <h1 className="font-display text-4xl leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
                                Consulta tu saldo de puntos en segundos.
                            </h1>

                            <p className="max-w-xl text-lg text-ink-600">
                                Ingresa tu número de celular y te mostramos el balance. Si hay desglose por vendedor, también aparece.
                            </p>

                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    type="button"
                                    className="rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl"
                                    onClick={() => scrollToSection('consulta')}
                                >
                                    Consultar ahora
                                </button>
                                <button
                                    type="button"
                                    className="rounded-full border border-ink-300 px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
                                    onClick={() => scrollToSection('resultado')}
                                >
                                    Ver resultado
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-6 pt-4 text-sm text-ink-500">
                                <div>
                                    <p className="font-display text-2xl text-ink-900">Seguro</p>
                                    <p>Solo lo necesario</p>
                                </div>
                                <div>
                                    <p className="font-display text-2xl text-ink-900">Rápido</p>
                                    <p>Respuesta inmediata</p>
                                </div>
                                <div>
                                    <p className="font-display text-2xl text-ink-900">Claro</p>
                                    <p>Sin vueltas</p>
                                </div>
                            </div>
                        </div>

                        {/* Widgets */}
                        <div className="relative reveal-on-nav">
                            <div className="absolute -right-6 top-6 hidden h-24 w-24 rounded-3xl bg-ink-900 opacity-10 blur-lg lg:block" />
                            <div className="relative space-y-4">
                                <div className="widget-card widget-float-1 reveal-on-nav js-anime-card">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Puntos</p>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.cls}`}>
                                            {pill.text}
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-3xl">
                                        {result?.found ? Number(result.points || 0).toLocaleString('es-CO') : '—'}
                                    </p>
                                    <p className="text-sm text-ink-500">{result?.found ? 'Balance disponible' : 'Consulta para ver tu saldo'}</p>
                                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-200">
                                        <div
                                            className="h-full rounded-full bg-ink-900 transition-all duration-700 animate-progress"
                                            style={{ width: progressWidth }}
                                        />
                                    </div>
                                </div>

                                <div className="widget-card widget-float-2 reveal-on-nav js-anime-card">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Clientes</p>
                                        <span className="text-xs font-semibold text-ink-700">
                                            {result?.found ? (result.name || 'Cliente') : '—'}
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-2xl">Consulta pública</p>
                                    <div className="mt-3 flex items-center gap-3 text-sm text-ink-500">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {result?.found ? 'Perfil encontrado' : 'Disponible 24/7'}
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
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Desglose</p>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                            {result?.found ? `${result.breakdown?.length || 0} items` : '—'}
                                        </span>
                                    </div>
                                    <p className="mt-4 font-display text-2xl">Por vendedor</p>
                                    <p className="text-sm text-ink-500">
                                        {result?.found && result.breakdown?.length ? 'Disponible' : 'Opcional'}
                                    </p>
                                    <div className="mt-4 grid grid-cols-5 gap-2">
                                        {[...Array(5)].map((_, idx) => (
                                            <div key={idx} className="h-2 rounded-full bg-sand-200-20">
                                                <div
                                                    className="h-full rounded-full bg-emerald-300 animate-spark"
                                                    style={{ animationDelay: `${idx * 0.3}s` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CONSULTA */}
                    <section id="consulta" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-20">
                        <div className="grid gap-10 rounded-[32px] border border-ink-200 bg-sand-50 px-8 py-12 lg:grid-cols-[1fr_0.9fr] reveal-on-nav js-anime-card">
                            <div className="space-y-4 reveal-on-nav">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">Consulta</p>
                                <h2 className="font-display text-3xl text-ink-900">Ingresa tu número y listo.</h2>
                                <p className="text-ink-600">El sistema valida y devuelve el saldo. Si no existe, te lo dice directo.</p>

                                <div className="rounded-3xl bg-ink-900 p-6 text-sand-50">
                                    <p className="font-display text-xl">Tip</p>
                                    <p className="mt-2 text-sm text-sand-100">
                                        Si “No encontrado”, revisa si el cliente está registrado o si cambió de número.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={submit} className="space-y-4 reveal-on-nav js-anime-card">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                        Número de celular
                                    </label>

                                    <div className="mt-2">
                                        <PhoneInput
                                            country="co"
                                            value={phone}
                                            onChange={(value) => setPhone(value)}
                                            inputClass="w-full"
                                            inputStyle={{
                                                width: '100%',
                                                height: '50px',
                                                borderRadius: '18px',
                                                border: '1px solid rgba(229,222,216,1)',
                                                background: 'rgba(255,255,255,0.9)',
                                                color: 'rgba(23,20,21,1)',
                                                boxShadow: 'none',

                                                // ✅ CLAVE: evita zoom en iOS (inputs < 16px hacen zoom)
                                                fontSize: '16px',
                                                lineHeight: '20px',
                                            }}
                                            buttonStyle={{
                                                borderRadius: '18px 0 0 18px',
                                                border: '1px solid rgba(229,222,216,1)',
                                                background: 'rgba(255,255,255,0.9)',
                                            }}
                                            inputProps={{
                                                id: 'phone',
                                                name: 'phone',

                                                // ✅ ayuda a evitar saltos raros en contenedores con scroll (iOS)
                                                onFocus: onPhoneFocus,
                                            }}
                                        />
                                    </div>

                                    {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-sand-50 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
                                >
                                    {loading ? 'Consultando…' : 'Consultar puntos'}
                                </button>

                                <p className="text-xs text-ink-500">Respuesta inmediata.</p>
                            </form>
                        </div>
                    </section>

                    {/* RESULTADO */}
                    <section id="resultado" className="mx-auto w-full max-w-6xl scroll-mt-28 px-6 pb-24">
                        <div className="rounded-[32px] border border-ink-200 bg-white/85 p-8 shadow-[0_20px_60px_rgba(23,20,21,0.10)] backdrop-blur reveal-on-nav js-anime-card">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500">Resultado</p>
                                    <h3 className="mt-1 font-display text-2xl text-ink-900">
                                        {result?.found ? 'Saldo de puntos' : 'Aún sin consulta'}
                                    </h3>
                                </div>
                                <span className={`rounded-full px-3 py-2 text-xs font-semibold ${pill.cls}`}>{pill.text}</span>
                            </div>

                            {!result && (
                                <div className="mt-6 rounded-3xl bg-ink-100 p-6 text-ink-700">
                                    Haz una consulta para ver el resultado aquí.
                                </div>
                            )}

                            {result && result.found === false && (
                                <div className="mt-6 rounded-3xl bg-rose-50 p-6">
                                    <p className="font-semibold text-rose-700">No encontramos un usuario con ese número.</p>
                                    <p className="mt-1 text-sm text-rose-700/80">Verifica el número e intenta nuevamente.</p>
                                </div>
                            )}

                            {result && result.found && (
                                <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                    <div className="rounded-3xl bg-sand-50 p-6 border border-ink-200">
                                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Usuario</p>
                                        <p className="mt-2 font-display text-2xl text-ink-900">{result.name || '—'}</p>

                                        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-500">Puntos</p>
                                        <p className="mt-2 font-display text-4xl text-ink-900">
                                            {Number(result.points || 0).toLocaleString('es-CO')}
                                        </p>

                                        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-ink-200">
                                            <div className="h-full rounded-full bg-ink-900 transition-all duration-700" style={{ width: progressWidth }} />
                                        </div>

                                        <p className="mt-4 text-sm text-ink-500">
                                            Cel: {String(result.phone || '').replace(/\D+/g, '') || '—'}
                                        </p>
                                    </div>

                                    <div className="rounded-3xl border border-ink-200 bg-white p-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Desglose por vendedor</p>
                                            <span className="text-xs font-semibold text-ink-700">
                                                {result.breakdown?.length ? `${result.breakdown.length} ítems` : '—'}
                                            </span>
                                        </div>

                                        {result.breakdown?.length > 0 ? (
                                            <div className="mt-4 divide-y rounded-2xl border border-ink-200 bg-white">
                                                {result.breakdown.map((row, idx) => (
                                                    <div key={`${row.admin_id ?? 'na'}-${idx}`} className="flex items-center justify-between px-4 py-3 text-sm">
                                                        <span className="text-ink-700">{row.admin_name || 'Sin admin'}</span>
                                                        <span className="font-semibold">{Number(row.points_balance || 0).toLocaleString('es-CO')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-2xl bg-ink-100 p-4 text-sm text-ink-700">
                                                No hay desglose disponible.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="relative z-10 border-t border-ink-200 px-6 py-8 text-center text-xs text-ink-500">
                    {appName} · Consulta pública de puntos
                </footer>
            </div>

            {/* ESTILOS */}
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

                .font-display { font-family: 'Clash Display', 'Plus Jakarta Sans', sans-serif; }
                body { font-family: 'Plus Jakarta Sans', sans-serif; }
                html { scroll-behavior: smooth; }

                .welcome-scroll {
                    height: 100vh;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    -webkit-overflow-scrolling: touch;
                }
                .welcome-scroll.is-zoomed {
                    height: auto;
                    overflow: visible;
                }
                .welcome-scroll::-webkit-scrollbar { width: 0; height: 0; }

                .bg-sand-50 { background-color: var(--sand-50); }
                .text-ink-900 { color: var(--ink-900); }
                .text-ink-700 { color: var(--ink-700); }
                .text-ink-600 { color: var(--ink-600); }
                .text-ink-500 { color: var(--ink-500); }
                .text-ink-400 { color: var(--ink-300); }
                .border-ink-200 { border-color: var(--ink-200); }
                .border-ink-300 { border-color: var(--ink-300); }

                .bg-ink-900 { background-color: var(--ink-900); }
                .bg-ink-100 { background-color: #efe9e6; }
                .bg-aurora-1 { background-color: var(--aurora-1); }
                .bg-aurora-2 { background-color: var(--aurora-2); }

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

                .arrow-btn:nth-child(2) { animation-delay: 0.6s; }

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

                @media (max-width: 900px) { .arrow-nav { right: 12px; } }
                @media (max-width: 720px) { .arrow-nav { right: 12px; bottom: 20px; } }

                .text-sand-50 { color: #fef9f5; }
                .text-sand-100 { color: #f4eee8; }
                .text-sand-200 { color: #e7ded6; }

                .bg-sand-50-10 { background-color: rgba(248, 245, 240, 0.1); }
                .bg-sand-50-20 { background-color: rgba(248, 245, 240, 0.2); }
                .bg-sand-200-20 { background-color: rgba(207, 199, 195, 0.2); }
                .border-sand-200-30 { border-color: rgba(207, 199, 195, 0.3); }

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

                .widget-float-1 { animation: float 6s ease-in-out infinite; }
                .widget-float-2 { animation: float 7s ease-in-out infinite; }
                .widget-float-3 { animation: float 8s ease-in-out infinite; }

                .animate-progress { animation: progress 2.6s ease-in-out infinite; }
                .animate-spark { width: 100%; animation: spark 2.4s ease-in-out infinite; }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes progress {
                    0% { width: 20%; }
                    50% { width: 78%; }
                    100% { width: 60%; }
                }

                @keyframes spark {
                    0% { width: 10%; opacity: 0.4; }
                    50% { width: 80%; opacity: 1; }
                    100% { width: 30%; opacity: 0.6; }
                }

                /* PhoneInput: focus estilo Welcome */
                .react-tel-input .form-control:focus {
                    border-color: rgba(23, 20, 21, 1) !important;
                    box-shadow: 0 0 0 3px rgba(23, 20, 21, 0.12) !important;
                }
                .react-tel-input .selected-flag:hover,
                .react-tel-input .selected-flag:focus {
                    background: rgba(248, 245, 240, 0.98) !important;
                }

                /* ✅ FIX DEFINITIVO iOS: evita zoom (inputs < 16px) */
                @media (max-width: 768px) {
                    .react-tel-input .form-control {
                        font-size: 16px !important;
                        line-height: 20px !important;
                    }
                }
            `}</style>
        </>
    );
}
