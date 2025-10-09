// resources/js/Pages/Sales/Index.jsx
import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { Dialog, Popover, Transition, Portal } from '@headlessui/react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function EyeIcon({ className = 'w-5 h-5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
    );
}

/** Popover responsive: hover en desktop, tap en mobile, sin clipping (usa Portal) */
function ItemsPopover({ sale }) {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);
    const btnRef = useRef(null);
    const closeTimer = useRef(null);

    useEffect(() => () => clearTimeout(closeTimer.current), []);

    const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

    async function ensureLoaded() {
        if (loadedRef.current) return;
        if (Array.isArray(sale.items)) {
            setItems(sale.items);
            loadedRef.current = true;
            return;
        }
        try {
            setLoading(true);
            const res = await fetch(route('sales.items', sale.id), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setItems(data?.items ?? []);
            loadedRef.current = true;
        } catch (e) {
            console.error(e);
            toast.error('No se pudieron cargar los ítems');
        } finally {
            setLoading(false);
        }
    }

    const openViaHover = (isOpen) => {
        if (!isOpen && btnRef.current) btnRef.current.click();
    };
    const scheduleClose = (isOpen) => {
        if (!isOpen) return;
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => {
            if (btnRef.current) btnRef.current.click();
        }, 120);
    };

    const panelFixedStyle = () => {
        const b = btnRef.current?.getBoundingClientRect();
        if (!b) return {};
        return {
            position: 'fixed',
            top: b.bottom + 8,
            left: Math.min(
                Math.max(8, b.left),
                Math.max(8, window.innerWidth - 8 - 288) // 288 = w-72
            ),
        };
    };

    const PanelContent = () => (
        <>
            <div className="text-xs font-semibold text-gray-700 mb-1">Ítems vendidos</div>
            {loading ? (
                <div className="text-xs text-gray-500">Cargando…</div>
            ) : !items || items.length === 0 ? (
                <div className="text-xs text-gray-500">Sin ítems.</div>
            ) : (
                <ul className="text-sm space-y-1">
                    {items.map((it) => {
                        const qty = Number(it.quantity ?? it.qty ?? 0);
                        const name = it?.inventory?.name ?? it?.name ?? `#${it.inventory_id ?? it.id}`;
                        const unit = it?.inventory?.unit ?? it?.unit ?? '';
                        return (
                            <li key={it.id ?? `${name}-${qty}`}>
                                <span className="text-gray-800">{name}</span>{' — '}
                                <span className="text-gray-600">
                                    {qty.toLocaleString('es-CO', { maximumFractionDigits: 3 })}
                                    {unit ? ` ${unit}` : ''}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );

    return (
        <Popover className="relative inline-block">
            {({ open }) => (
                <>
                    <div
                        className="inline-flex items-center"
                        onMouseEnter={async () => {
                            if (!isDesktop()) return;
                            await ensureLoaded();
                            openViaHover(open);
                        }}
                        onMouseLeave={() => {
                            if (!isDesktop()) return;
                            scheduleClose(open);
                        }}
                    >
                        <Popover.Button
                            ref={btnRef}
                            className="p-1 rounded hover:bg-gray-100 focus:outline-none"
                            onClick={ensureLoaded}
                            aria-label="Ver ítems"
                        >
                            <EyeIcon className="w-5 h-5 text-gray-600" />
                        </Popover.Button>
                    </div>

                    {/* Desktop */}
                    <Portal>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-75"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                        >
                            <Popover.Panel
                                className="hidden md:block z-[70]"
                                style={panelFixedStyle()}
                                onMouseEnter={() => clearTimeout(closeTimer.current)}
                                onMouseLeave={() => scheduleClose(true)}
                            >
                                <div className="w-72 max-h-64 overflow-auto rounded-lg border bg-white shadow-lg p-2">
                                    <PanelContent />
                                </div>
                            </Popover.Panel>
                        </Transition>

                        {/* Mobile: overlay + sheet */}
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-150"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Popover.Overlay className="md:hidden fixed inset-0 bg-black/40 z-[69]" />
                        </Transition>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="translate-y-4 opacity-0"
                            enterTo="translate-y-0 opacity-100"
                            leave="transition ease-in duration-150"
                            leaveFrom="translate-y-0 opacity-100"
                            leaveTo="translate-y-4 opacity-0"
                        >
                            <Popover.Panel className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] w-[min(24rem,calc(100vw-2rem))] max-h-[60vh] overflow-auto rounded-xl border bg-white shadow-2xl p-3">
                                <div className="relative">
                                    <Popover.Button className="absolute top-0 right-0 p-1 rounded hover:bg-gray-100" aria-label="Cerrar">
                                        ✕
                                    </Popover.Button>
                                    <PanelContent />
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </Portal>
                </>
            )}
        </Popover>
    );
}

/** Helper para extraer nombres únicos de métodos de pago de una venta */
function paymentNames(sale) {
    const set = new Set();
    if (Array.isArray(sale?.payments)) {
        sale.payments.forEach(p => {
            const n =
                p?.payment_method?.name ??
                p?.method?.name ??
                p?.method_name ??
                p?.name ??
                null;
            if (n) set.add(n);
        });
    }
    if (!set.size && sale?.payment_methods_text) {
        String(sale.payment_methods_text)
            .split(',')
            .map(x => x.trim())
            .filter(Boolean)
            .forEach(n => set.add(n));
    }
    return Array.from(set);
}

export default function Index() {
    const {
        sales,
        items = [],
        paymentMethods = [],
        deliverers = [],
        auth,
        errors = {},
        flash = {},
    } = usePage().props;

    const isAdmin = useMemo(() => {
        const rolesRaw = auth?.user?.roles ?? auth?.roles ?? [];
        const roles = Array.isArray(rolesRaw)
            ? rolesRaw.map(r => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : [];
        return roles.includes('admin') || roles.includes('super-admin');
    }, [auth]);

    const rows = Array.isArray(sales) ? sales : (sales?.data ?? []);
    const links = Array.isArray(sales) ? [] : (sales?.links ?? []);

    // ===== Carrito =====
    const [openCart, setOpenCart] = useState(false);
    const [cart, setCart] = useState({});                 // { [inventoryId]: qty | '' }
    const [linePrice, setLinePrice] = useState({});       // total por ítem (override)
    const [cartItems, setCartItems] = useState([]);
    const [bulkFlow, setBulkFlow] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // ===== Cantidades =====
    const STEP = 0.5;
    const clampFloat = (n, min, max) => Math.max(min, Math.min(max, n));
    const snapToStep = (n, step = STEP) => Math.round(n / step) * step;
    const normalizeDecimal = (raw) => {
        if (raw === '' || raw == null) return '';
        const s = String(raw).replace(',', '.');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : '';
    };
    const fmtQty = (q) => {
        const n = Number(q ?? 0);
        return Number.isFinite(n)
            ? n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
            : '0';
    };

    const setQty = (id, raw, max) => {
        if (raw === '') return setCart(p => ({ ...p, [id]: '' }));
        const n = normalizeDecimal(raw);
        if (n === '') return;
        setCart(p => ({ ...p, [id]: clampFloat(n, 0, Number(max ?? 0)) }));
    };
    const commitQty = (id, max) => {
        setCart(prev => {
            const raw = prev[id];
            if (raw === '' || raw === undefined) return { ...prev, [id]: '' };
            let n = normalizeDecimal(raw); if (n === '') n = 0;
            n = clampFloat(snapToStep(n), 0, Number(max ?? 0));
            if (n > 0 && n < STEP) n = STEP;
            return { ...prev, [id]: n };
        });
    };
    function addQty(id, delta, max) {
        setCart(prev => {
            const cur = normalizeDecimal(prev[id] ?? 0) || 0;
            const next = cur === 0 && delta > 0 ? STEP : cur + (delta * STEP);
            return { ...prev, [id]: clampFloat(snapToStep(next), 0, Number(max ?? 0)) };
        });
    }

    // ===== Anular venta =====
    function cancelSale(s) {
        if (!s) return;
        const reason = window.prompt('Motivo de anulación (opcional):', '');
        if (!window.confirm(`¿Anular la venta #${s.id}? Esto devolverá el stock.`)) return;

        router.post(
            route('sales.cancel', s.id),
            { reason: reason || null },
            {
                preserveScroll: true,
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
                onSuccess: () => toast.success(`Venta #${s.id} anulada`),
                onError: (errs) => { console.error(errs); showErrors(errs); },
            }
        );
    }

    // ===== Total carrito =====
    const totalSum = useMemo(() => {
        return Object.entries(cart).reduce((acc, [id, qtyRaw]) => {
            const prod = items.find(x => x.id === Number(id));
            if (!prod) return acc;
            let qty = normalizeDecimal(qtyRaw ?? 0) || 0;
            qty = clampFloat(snapToStep(qty), 0, Number(prod.quantity ?? 0));
            if (qty <= 0) return acc;
            const override = linePrice[id];
            const lineTotal =
                override !== undefined && override !== '' ? Number(override)
                    : Number(prod.sale_price ?? 0) * qty;
            return acc + (Number.isFinite(lineTotal) ? lineTotal : 0);
        }, 0);
    }, [cart, linePrice, items]);

    // ===== Pago / deuda =====
    const [openPay, setOpenPay] = useState(false);
    const [selected, setSelected] = useState(null);
    const [pd, setPd] = useState({ paid: 0, pay: 0, name: '', phone: '' });
    const [newDue, setNewDue] = useState(0);

    const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? null);
    const [reference, setReference] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [deliveryId, setDeliveryId] = useState('');
    const [km, setKm] = useState('');

    useEffect(() => {
        if (!methodId && paymentMethods.length) setMethodId(paymentMethods[0].id);
    }, [paymentMethods, methodId]);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (bulkFlow) {
            setNewDue(Math.max(0, Number(totalSum) - Number(pd.pay || 0)));
        } else if (selected) {
            const bal = Number(selected.balance ?? Math.max(0, (selected.total ?? 0) - (selected.paid ?? 0)));
            setNewDue(Math.max(0, bal - Number(pd.pay || 0)));
        } else setNewDue(0);
    }, [pd.pay, totalSum, bulkFlow, selected]);

    useEffect(() => { if (!deliveryId) setKm(''); }, [deliveryId]);

    function doCheckout() {
        const lines = Object.entries(cart)
            .map(([i, qtyRaw]) => {
                const prod = items.find(x => x.id === Number(i));
                if (!prod) return null;

                let qty = normalizeDecimal(qtyRaw ?? 0) || 0;
                qty = clampFloat(snapToStep(qty), 0, Number(prod.quantity ?? 0));
                if (qty > 0 && qty < STEP) qty = STEP;
                if (qty < STEP) return null;

                const override = linePrice[i];
                const hasOverride = override !== undefined && override !== '' && Number(override) > 0;
                const lineTotal = hasOverride ? Number(override) : Number(prod.sale_price ?? 0) * qty;
                if (!(lineTotal > 0)) return null;

                const unit = lineTotal / qty;
                return {
                    inventory_id: Number(i),
                    quantity: parseFloat(qty.toFixed(3)),
                    unit_price: hasOverride ? parseFloat(unit.toFixed(2)) : null,
                    total_price: parseFloat(lineTotal.toFixed(2)),
                    discount: 0,
                };
            })
            .filter(Boolean);

        if (!lines.length) return toast.error('Agrega productos con total > 0');

        setCartItems(lines);
        setPd({ paid: 0, pay: Number(totalSum), name: '', phone: '' });
        setCustomerId(''); setDeliveryId(''); setKm('');
        setBulkFlow(true);
        setOpenCart(false);
        setOpenPay(true);
    }

    function beginPay(sale) {
        setSelected(sale);
        setPd({
            paid: Number(sale.paid ?? 0),
            pay: Number(sale.balance ?? Math.max(0, (sale.total ?? 0) - (sale.paid ?? 0))),
            name: '', phone: '',
        });
        setReference('');
        setBulkFlow(false);
        setOpenPay(true);
    }

    function showErrors(errs) {
        const msgs = [];
        Object.entries(errs || {}).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(m => msgs.push(`${k}: ${m}`));
            else if (typeof v === 'string') msgs.push(`${k}: ${v}`);
        });
        toast.error(msgs.join('\n') || 'Error al crear venta');
    }

    function submitPay(e) {
        e.preventDefault();
        const amount = Number(pd.pay || 0);
        if (amount <= 0) return toast.error('Ingresa un monto válido');
        if (!methodId) return toast.error('Selecciona un método de pago');

        if (bulkFlow) {
            let customerIdStr = null;
            if (customerId !== '' && customerId != null) {
                const n = Number(customerId);
                if (!Number.isFinite(n) || n < 0 || n > 9999) return toast.error('ID de cliente inválido (0–9999)');
                customerIdStr = String(Math.floor(n)).padStart(4, '0');
            }
            const hasDelivery = String(deliveryId || '') !== '';
            const kmVal = parseFloat(km || '0');
            if (hasDelivery && !(kmVal > 0)) return toast.error('Ingresa los KM (> 0)');
            if (amount < totalSum && (!pd.name || !pd.phone))
                return toast.error('Si es pago parcial, ingresa nombre y teléfono');

            const payload = {
                customer_id: customerIdStr,
                discount: 0,
                tax: 0,
                items: cartItems,
                payments: [{ payment_method_id: methodId, amount, reference: reference || null }],
            };
            if (hasDelivery) { payload.delivery_id = Number(deliveryId); payload.km = kmVal; }

            router.post(route('sales.store'), payload, {
                preserveScroll: true,
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setOpenPay(false); setCart({}); setLinePrice({}); setDeliveryId(''); setKm('');
                    toast.success('Venta creada correctamente');
                },
                onError: (errs) => { console.error(errs); showErrors(errs); },
            });
            return;
        }

        if (!selected) return;
        router.post(
            route('sales.payments.store', selected.id),
            { payment_method_id: methodId, amount, reference: reference || null },
            {
                preserveScroll: true,
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
                onSuccess: () => { setOpenPay(false); toast.success('Pago registrado correctamente'); },
                onError: (errs) => { console.error(errs); showErrors(errs); },
            }
        );
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Ventas</h2>}
        >
            <Head title="Ventas" />

            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                {errors && Object.keys(errors).length > 0 && (
                    <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
                        <ul className="list-disc pl-5">
                            {Object.entries(errors).map(([k, v]) => (
                                Array.isArray(v) ? v.map((m, i) => <li key={`${k}-${i}`}><b>{k}</b>: {m}</li>)
                                    : <li key={k}><b>{k}</b>: {String(v)}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                        onClick={() => setOpenCart(true)}
                        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md text-center"
                    >
                        + Nueva Venta
                    </button>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                    {rows.map(s => {
                        const methods = paymentNames(s);
                        return (
                            <div key={s.id} className="bg-white rounded-lg shadow p-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold">#{s.id}</div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'pagado' ? 'bg-green-100 text-green-800'
                                            : s.status === 'parcial' ? 'bg-yellow-100 text-yellow-800'
                                                : s.status === 'anulada' ? 'bg-gray-200 text-gray-700'
                                                    : 'bg-red-100 text-red-800'}`}>{s.status}</span>
                                </div>

                                <div className="mt-2 text-sm text-gray-600">
                                    {s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : ''}
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Ítems:</span>
                                        <span>{s.items_count ?? s.items?.length ?? '-'}</span>
                                        <ItemsPopover sale={s} />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-gray-500">Formas de pago:</span>
                                        {methods.length ? (
                                            <div className="flex flex-wrap gap-1">
                                                {methods.map(n => (
                                                    <span key={n} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <span className="text-gray-400">—</span>}
                                    </div>

                                    <div><span className="text-gray-500">Total:</span> ${Number(s.total).toLocaleString('es-CO')}</div>
                                    <div><span className="text-gray-500">Pagado:</span> ${Number(s.paid).toLocaleString('es-CO')}</div>
                                    <div><span className="text-gray-500">Saldo:</span> ${Number(s.balance).toLocaleString('es-CO')}</div>
                                </div>

                                <div className="mt-3 flex gap-3">
                                    {s.status !== 'pagado' && s.status !== 'anulada' && (
                                        <button onClick={() => beginPay(s)} className="flex-1 text-yellow-700 border border-yellow-300 rounded-md py-2">
                                            Saldar Deuda
                                        </button>
                                    )}
                                    <Link href={route('sales.show', s.id)} className="flex-1 text-center text-indigo-700 border border-indigo-300 rounded-md py-2">
                                        Ver
                                    </Link>
                                    {isAdmin && s.status !== 'anulada' && (
                                        <button onClick={() => cancelSale(s)} className="flex-1 text-white bg-red-600 hover:bg-red-700 rounded-md py-2 disabled:opacity-50" disabled={submitting}>
                                            Anular
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {rows.length === 0 && <div className="text-sm text-gray-500 text-center">Sin registros.</div>}
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block bg-white shadow-sm sm:rounded-lg overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {['#', 'Fecha', 'Ítems', 'Formas de pago', 'Total', 'Pagado', 'Saldo', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map(s => {
                                const methods = paymentNames(s);
                                return (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">#{s.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : ''}</td>

                                        {/* Ítems + Popover */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center gap-2">
                                                <span>{s.items_count ?? s.items?.length ?? '-'}</span>
                                                <ItemsPopover sale={s} />
                                            </div>
                                        </td>

                                        {/* Formas de pago */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {methods.length ? (
                                                <div className="flex flex-wrap gap-1 max-w-[22rem]">
                                                    {methods.map(n => (
                                                        <span key={n} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                                            {n}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">${Number(s.total).toLocaleString('es-CO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">${Number(s.paid).toLocaleString('es-CO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">${Number(s.balance).toLocaleString('es-CO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full ${s.status === 'pagado' ? 'bg-green-100 text-green-800'
                                                    : s.status === 'parcial' ? 'bg-yellow-100 text-yellow-800'
                                                        : s.status === 'anulada' ? 'bg-gray-200 text-gray-700'
                                                            : 'bg-red-100 text-red-800'}`}>{s.status}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap space-x-3">
                                            {s.status !== 'pagado' && s.status !== 'anulada' && (
                                                <button onClick={() => beginPay(s)} className="text-yellow-600 hover:text-yellow-900">Saldar Deuda</button>
                                            )}
                                            <Link href={route('sales.show', s.id)} className="text-indigo-600 hover:text-indigo-900">Ver</Link>
                                            {isAdmin && s.status !== 'anulada' && (
                                                <button onClick={() => cancelSale(s)} className="text-red-600 hover:text-red-900 disabled:opacity-50" disabled={submitting}>
                                                    Anular
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={9}>Sin registros.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {links.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                        {links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                preserveScroll
                                className={`px-3 py-1 rounded border ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ===== Modal Carrito ===== */}
            <Dialog open={openCart} onClose={() => setOpenCart(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-0 md:p-4">
                    <Dialog.Panel
                        className="
              w-full max-w-5xl bg-white shadow-xl flex flex-col
              h-[100dvh] md:h-auto md:max-h-[90vh]
              rounded-none md:rounded-2xl
            "
                    >
                        <div className="p-4 md:p-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                            <Dialog.Title className="text-base md:text-lg font-bold">Carrito</Dialog.Title>
                            <button onClick={() => setOpenCart(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="p-4 md:p-5 flex-1 overflow-y-auto md:max-h-[65vh]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {items.map(prod => (
                                    <div key={prod.id} className="border p-3 md:p-4 rounded-lg">
                                        <h3 className="font-semibold text-sm md:text-base">{prod.name ?? prod.code ?? `#${prod.id}`}</h3>
                                        <p className="text-xs md:text-sm text-gray-600">Stock: {fmtQty(prod.quantity)}</p>
                                        <p className="text-xs md:text-sm text-gray-600">
                                            Precio catálogo (unidad): ${Number(prod.sale_price ?? 0).toLocaleString('es-CO')}
                                        </p>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="mt-3 w-full border px-2 py-2 rounded-md text-sm"
                                            placeholder="Precio total del ítem (opcional)"
                                            value={linePrice[prod.id] ?? ''}
                                            onChange={e => setLinePrice(prev => ({ ...prev, [prod.id]: e.target.value }))}
                                        />

                                        <div className="mt-3 flex items-stretch gap-2">
                                            <button
                                                type="button"
                                                onClick={() => addQty(prod.id, -1, prod.quantity)}
                                                className="w-10 h-10 grid place-items-center bg-gray-100 rounded-md text-xl"
                                                aria-label="Restar"
                                            >−</button>

                                            <input
                                                type="number"
                                                min="0"
                                                max={prod.quantity}
                                                step="0.5"
                                                lang="en"
                                                inputMode="decimal"
                                                className="flex-1 text-center border rounded-md px-2 py-2 text-base"
                                                placeholder="0.5"
                                                value={cart[prod.id] ?? ''}
                                                onChange={e => setQty(prod.id, e.target.value, prod.quantity)}
                                                onBlur={() => commitQty(prod.id, prod.quantity)}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => addQty(prod.id, 1, prod.quantity)}
                                                className="w-10 h-10 grid place-items-center bg-gray-100 rounded-md text-xl"
                                                aria-label="Sumar"
                                            >＋</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 md:p-5 border-t sticky bottom-0 bg-white z-10">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between">
                                <div className="text-base md:text-lg font-semibold">
                                    Total: ${Number(totalSum).toLocaleString('es-CO')}
                                </div>
                                <button
                                    onClick={doCheckout}
                                    className="w-full md:w-auto px-4 py-3 md:py-2 bg-green-600 text-white rounded-md"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* ===== Modal Pago / Deuda ===== */}
            <Dialog open={openPay} onClose={() => setOpenPay(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-0 md:p-4">
                    <form
                        onSubmit={submitPay}
                        className="
              w-full max-w-xl bg-white shadow-xl flex flex-col
              h-[100dvh] md:h-auto md:max-h-[90vh]
              rounded-none md:rounded-2xl overflow-hidden
            "
                    >
                        <div className="p-4 md:p-5 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                            <Dialog.Title className="text-base md:text-lg font-bold">
                                {bulkFlow ? 'Pago Carrito' : 'Saldar Deuda'}
                            </Dialog.Title>
                            <button onClick={() => setOpenPay(false)} type="button" className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="p-4 md:p-5 flex-1 overflow-y-auto space-y-4">
                            {bulkFlow && (
                                <>
                                    <div>
                                        <label className="block text-sm">ID Cliente (4 dígitos, opcional)</label>
                                        <input
                                            type="number" min="0" max="9999" step="1"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={customerId}
                                            onChange={e => setCustomerId(e.target.value)}
                                            placeholder="0000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm">Dealer</label>
                                        <select
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={deliveryId}
                                            onChange={(e) => setDeliveryId(e.target.value)}
                                        >
                                            <option value="">— Sin dealer —</option>
                                            {deliverers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm">Distancia (km)</label>
                                        <input
                                            type="number" step="0.01" min="0"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={km}
                                            onChange={e => setKm(e.target.value)}
                                            placeholder={deliveryId ? '0.00' : 'Selecciona un dealer'}
                                            disabled={!deliveryId}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Obligatorio solo si seleccionas un dealer.</p>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm">Método de pago</label>
                                <select
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={methodId ?? ''}
                                    onChange={e => setMethodId(Number(e.target.value))}
                                >
                                    {paymentMethods.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm">Total</label>
                                <div className="mt-1 font-medium">
                                    ${Number(bulkFlow ? totalSum : (selected?.total || 0)).toLocaleString('es-CO')}
                                </div>
                            </div>

                            {!bulkFlow && selected && (
                                <div>
                                    <label className="block text-sm">Ya pagado</label>
                                    <div className="mt-1">${Number(pd.paid).toLocaleString('es-CO')}</div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="pay" className="block text-sm">Monto a pagar ahora</label>
                                <input
                                    id="pay" type="number" step="0.01" min="0"
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={pd.pay}
                                    onChange={e => setPd(d => ({ ...d, pay: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm">Referencia (opcional)</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    placeholder="# transacción / voucher"
                                />
                            </div>

                            <div>
                                <label className="block text-sm">Saldo pendiente:</label>
                                <div className="mt-1">${Number(newDue).toLocaleString('es-CO')}</div>
                            </div>

                            {newDue > 0 && (
                                <>
                                    <div>
                                        <label className="block text-sm">Nombre deudor</label>
                                        <input
                                            name="customer_name" type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.name}
                                            onChange={e => setPd(d => ({ ...d, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm">Teléfono deudor</label>
                                        <input
                                            name="customer_phone" type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.phone}
                                            onChange={e => setPd(d => ({ ...d, phone: e.target.value }))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 md:p-5 border-t bg-white sticky bottom-0">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOpenPay(false)}
                                    className="w-full md:w-auto px-4 py-3 md:py-2 border rounded-md"
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`w-full md:w-auto px-4 py-3 md:py-2 text-white rounded-md ${submitting ? 'bg-gray-400' : 'bg-blue-600'}`}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Procesando…' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
