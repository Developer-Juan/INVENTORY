// resources/js/Pages/Sales/Index.jsx
import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { Dialog, Popover, Transition, Portal } from '@headlessui/react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

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
                Math.max(8, window.innerWidth - 8 - 288) // 288 = w-72 aprox ancho panel
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

                    <Portal>
                        {/* Desktop panel flotante */}
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

                        {/* Mobile overlay + sheet */}
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
        saleStatuses = {},   // <-- mapa tipo { pagado: 'Pagado', parcial: 'Parcial', ... }
        filters = {},        // <-- { dealer_id, from_date, to_date, payment_method_id, status }
        pointsSettings = null,
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

    const statusLabel = (status) => saleStatuses?.[status] ?? status;
    const statusClass = (status) => {
        if (status === 'pagado') return 'bg-green-100 text-green-800';
        if (status === 'parcial') return 'bg-yellow-100 text-yellow-800';
        if (status === 'anulada') return 'bg-gray-200 text-gray-700';
        if (status === 'gift') return 'bg-indigo-100 text-indigo-800';
        return 'bg-red-100 text-red-800';
    };

    // ===================== Filtros (estado controlado) =====================
    const [dealerId, setDealerId] = useState(filters.dealer_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [paymentMethodId, setPaymentMethodId] = useState(filters.payment_method_id ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function applyFilters(e) {
        e.preventDefault();

        const query = {};
        if (dealerId) query.dealer_id = dealerId;
        if (fromDate) query.from_date = fromDate;
        if (toDate) query.to_date = toDate;
        if (paymentMethodId) query.payment_method_id = paymentMethodId;
        if (status) query.status = status;

        router.get(route('sales.index'), query, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setDealerId('');
        setFromDate('');
        setToDate('');
        setPaymentMethodId('');
        setStatus('');

        router.get(route('sales.index'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    // ===================== Carrito / Venta =====================
    const [openCart, setOpenCart] = useState(false);
    const [cart, setCart] = useState({});           // { [inventoryId]: qty | '' }
    const [linePrice, setLinePrice] = useState({}); // { [inventoryId]: overrideTotal }
    const [cartItems, setCartItems] = useState([]);
    const [bulkFlow, setBulkFlow] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const STEP = 0.5;
    const clampFloat = (n, min, max) => Math.max(min, Math.min(max, n));
    const snapToStep = (n, step = STEP) => Math.round(n / step) * step;
    const normalizeDecimal = (raw) => {
        if (raw === '' || raw == null) return '';
        const s = String(raw).replace(',', '.');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : '';
    };
    const roundMoney = (value, digits = 2) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        const factor = 10 ** digits;
        return Math.round((n + Number.EPSILON) * factor) / factor;
    };
    const formatMoney = (value) => {
        const n = roundMoney(value);
        const isInt = Math.abs(n - Math.round(n)) < 1e-9;
        return n.toLocaleString('es-CO', {
            minimumFractionDigits: isInt ? 0 : 2,
            maximumFractionDigits: isInt ? 0 : 2,
        });
    };
    const moneyToInput = (value) => {
        const n = roundMoney(value);
        if (!Number.isFinite(n)) return '';
        return n % 1 === 0 ? String(Math.trunc(n)) : n.toFixed(2);
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
    const [pd, setPd] = useState({ paid: 0, pay: '', name: '', phone: '' });
    const [newDue, setNewDue] = useState(0);

    const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? null);
    const [reference, setReference] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customer, setCustomer] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [openCustomerModal, setOpenCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [pointsRedeem, setPointsRedeem] = useState(0);
    const [deliveryId, setDeliveryId] = useState('');
    const [km, setKm] = useState('');

    const pointValue = Number(pointsSettings?.value_per_point ?? 0);

    useEffect(() => {
        if (!methodId && paymentMethods.length) setMethodId(paymentMethods[0].id);
    }, [paymentMethods, methodId]);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const pointsDiscount = useMemo(() => {
        if (!customer || !(pointValue > 0)) return 0;
        const pts = Math.max(0, Number(pointsRedeem || 0));
        return Math.max(0, pts * pointValue);
    }, [customer, pointValue, pointsRedeem]);

    const maxPointsRedeem = useMemo(() => {
        if (!customer || !(pointValue > 0)) return 0;
        const byTotal = Math.floor(Number(totalSum || 0) / pointValue);
        const byBalance = Number(customer.points_balance ?? 0);
        return Math.max(0, Math.min(byTotal, byBalance));
    }, [customer, pointValue, totalSum]);

    useEffect(() => {
        setPointsRedeem((prev) => Math.min(Number(prev || 0), maxPointsRedeem));
    }, [maxPointsRedeem]);

    const totalAfterDiscount = useMemo(() => {
        if (!bulkFlow) return Number(totalSum);
        return Math.max(0, Number(totalSum) - Number(pointsDiscount || 0));
    }, [bulkFlow, totalSum, pointsDiscount]);

    useEffect(() => {
        if (bulkFlow) {
            setNewDue(roundMoney(Math.max(0, Number(totalAfterDiscount) - Number(pd.pay || 0))));
        } else if (selected) {
            const bal = Number(
                selected.balance ??
                Math.max(0, (selected.total ?? 0) - (selected.paid ?? 0))
            );
            setNewDue(roundMoney(Math.max(0, bal - Number(pd.pay || 0))));
        } else {
            setNewDue(0);
        }
    }, [pd.pay, totalAfterDiscount, bulkFlow, selected]);

    useEffect(() => {
        if (!bulkFlow) return;
        const cap = Number(totalAfterDiscount || 0);
        setPd((prev) => {
            const current = normalizeDecimal(prev.pay);
            if (current === '' || Number(current) <= cap) return prev;
            return { ...prev, pay: moneyToInput(cap) };
        });
    }, [totalAfterDiscount, bulkFlow]);

    useEffect(() => {
        if (bulkFlow && newDue > 0 && customer) {
            setPd((d) => ({
                ...d,
                name: d.name || customer.name || '',
                phone: d.phone || customer.phone || '',
            }));
        }
    }, [bulkFlow, newDue, customer]);

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
                const lineTotal = hasOverride
                    ? Number(override)
                    : Number(prod.sale_price ?? 0) * qty;
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
        setPointsRedeem(0);
        setPd({ paid: 0, pay: moneyToInput(totalSum), name: '', phone: '' });
        setCustomerId('');
        setCustomer(null);
        setDeliveryId('');
        setKm('');
        setBulkFlow(true);
        setOpenCart(false);
        setOpenPay(true);
    }

    function beginPay(sale) {
        setSelected(sale);
        setPd({
            paid: roundMoney(sale.paid ?? 0),
            pay: moneyToInput(
                sale.balance ??
                Math.max(0, (sale.total ?? 0) - (sale.paid ?? 0))
            ),
            name: sale.debtor_name ?? sale.customer_user?.name ?? '',
            phone: sale.debtor_phone ?? sale.customer_user?.phone ?? '',
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

    const normalizePhone = (v) => String(v ?? '').replace(/\D+/g, '');
    const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    async function lookupCustomer(raw) {
        const phone = normalizePhone(raw);
        if (!phone) return toast.error('Ingresa un celular válido');

        try {
            setLookupLoading(true);
            const res = await fetch(route('customers.lookup', { phone }), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!res.ok) {
                throw new Error('Lookup failed');
            }
            const data = await res.json();
            if (data?.found && data?.user) {
                setCustomer(data.user);
                setCustomerId(phone);
                return;
            }
            setCustomer(null);
            setNewCustomerName('');
            setNewCustomerPhone(phone);
            setOpenCustomerModal(true);
        } catch (e) {
            console.error(e);
            toast.error('No se pudo consultar el cliente');
        } finally {
            setLookupLoading(false);
        }
    }

    async function createCustomer() {
        const phone = normalizePhone(newCustomerPhone);
        if (!newCustomerName || !phone) {
            return toast.error('Nombre y celular son obligatorios');
        }
        try {
            setLookupLoading(true);
            const res = await fetch(route('customers.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    name: newCustomerName,
                    phone,
                }),
            });
            if (!res.ok) {
                let errMsg = 'Error al crear cliente';
                try {
                    const err = await res.json();
                    if (err?.message) errMsg = err.message;
                } catch {
                    // ignore json parse
                }
                throw new Error(errMsg);
            }
            const data = await res.json();
            if (data?.user) {
                setCustomer(data.user);
                setCustomerId(phone);
                setOpenCustomerModal(false);
            }
        } catch (e) {
            console.error(e);
            toast.error('No se pudo crear el cliente');
        } finally {
            setLookupLoading(false);
        }
    }

    function submitPay(e) {
        e.preventDefault();
        const amountRaw = normalizeDecimal(pd.pay);
        if (amountRaw === '' || Number(amountRaw) <= 0) {
            return toast.error('Ingresa un monto válido');
        }
        const amount = roundMoney(amountRaw);
        if (!methodId) return toast.error('Selecciona un método de pago');

        if (bulkFlow) {
            let customerIdStr = null;
            if (customerId !== '' && customerId != null) {
                const phone = normalizePhone(customerId);
                if (phone.length < 7 || phone.length > 15) {
                    return toast.error('Celular de cliente inválido (7–15 dígitos)');
                }
                customerIdStr = phone;
            }
            const hasDelivery = String(deliveryId || '') !== '';
            const kmVal = parseFloat(km || '0');
            if (hasDelivery && !(kmVal > 0)) {
                return toast.error('Ingresa los KM (> 0)');
            }
            if (
                amount < totalAfterDiscount &&
                (!pd.name || !pd.phone)
            ) {
                return toast.error(
                    'Si es pago parcial, ingresa nombre y teléfono'
                );
            }

            const payload = {
                customer_id: customerIdStr,
                discount: 0,
                tax: 0,
                items: cartItems,
                payments: [
                    {
                        payment_method_id: methodId,
                        amount,
                        reference: reference || null,
                    },
                ],
                debtor_name: pd.name || null,
                debtor_phone: pd.phone || null,
                points_redeem: Math.min(
                    Math.max(0, Number(pointsRedeem || 0)),
                    Number(maxPointsRedeem || 0)
                ),
            };
            if (hasDelivery) {
                payload.delivery_id = Number(deliveryId);
                payload.km = kmVal;
            }

                router.post(route('sales.store'), payload, {
                    preserveScroll: true,
                    onStart: () => setSubmitting(true),
                    onFinish: () => setSubmitting(false),
                    onSuccess: () => {
                        setOpenPay(false);
                        setCart({});
                        setLinePrice({});
                        setCustomer(null);
                        setCustomerId('');
                        setPointsRedeem(0);
                        setDeliveryId('');
                        setKm('');
                        toast.success('Venta creada correctamente');
                    },
                onError: (errs) => {
                    console.error(errs);
                    showErrors(errs);
                },
            });
            return;
        }

        // pago parcial/saldo de una venta existente
        if (!selected) return;

        router.post(
            route('sales.payments.store', selected.id),
            {
                payment_method_id: methodId,
                amount,
                reference: reference || null,
                debtor_name: pd.name || null,
                debtor_phone: pd.phone || null,
            },
            {
                preserveScroll: true,
                onStart: () => setSubmitting(true),
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setOpenPay(false);
                    toast.success('Pago registrado correctamente');
                },
                onError: (errs) => {
                    console.error(errs);
                    showErrors(errs);
                },
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
                            {Object.entries(errors).map(([k, v]) =>
                                Array.isArray(v) ? (
                                    v.map((m, i) => (
                                        <li key={`${k}-${i}`}>
                                            <b>{k}</b>: {m}
                                        </li>
                                    ))
                                ) : (
                                    <li key={k}>
                                        <b>{k}</b>: {String(v)}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>
                )}

                {/* ================== FILTROS ================== */}
                <form
                    onSubmit={applyFilters}
                    className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
                >
                    {/* Dealer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dealer
                        </label>
                        <select
                            className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            value={dealerId}
                            onChange={(e) => setDealerId(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {deliverers.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desde */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Desde
                        </label>
                        <input
                            type="date"
                            className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Hasta */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hasta
                        </label>
                        <input
                            type="date"
                            className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    {/* Forma de pago */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Forma de pago
                        </label>
                        <select
                            className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            value={paymentMethodId}
                            onChange={(e) => setPaymentMethodId(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {paymentMethods.map((pm) => (
                                <option key={pm.id} value={pm.id}>
                                    {pm.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Estado
                        </label>
                        <select
                            className="mt-1 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {Object.entries(saleStatuses).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botones */}
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                        >
                            Filtrar
                        </button>

                        <button
                            type="button"
                            className="flex-1 px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            onClick={clearFilters}
                        >
                            Limpiar
                        </button>
                    </div>
                </form>

                {/* BOTÓN NUEVA VENTA */}
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
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${statusClass(s.status)}`}
                                    >
                                        {statusLabel(s.status)}
                                    </span>
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
                                                    <span
                                                        key={n}
                                                        className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                                    >
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-gray-500">Total:</span>{' '}
                                        ${formatMoney(s.total)}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Pagado:</span>{' '}
                                        ${formatMoney(s.paid)}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Saldo:</span>{' '}
                                        ${formatMoney(s.balance)}
                                    </div>
                                    {s.status === 'parcial' && (s.debtor_name || s.debtor_phone) && (
                                        <div className="text-xs text-gray-600">
                                            <span className="text-gray-500">Deudor:</span>{' '}
                                            {s.debtor_name || '—'}
                                            {s.debtor_phone ? ` · ${s.debtor_phone}` : ''}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 flex gap-3">
                                    {s.status !== 'pagado' && s.status !== 'anulada' && s.status !== 'gift' && (
                                        <button
                                            onClick={() => beginPay(s)}
                                            className="flex-1 text-yellow-700 border border-yellow-300 rounded-md py-2"
                                        >
                                            Saldar Deuda
                                        </button>
                                    )}
                                    <Link
                                        href={route('sales.show', s.id)}
                                        className="flex-1 text-center text-indigo-700 border border-indigo-300 rounded-md py-2"
                                    >
                                        Ver
                                    </Link>
                                    {isAdmin && s.status !== 'anulada' && (
                                        <button
                                            onClick={() => cancelSale(s)}
                                            className="flex-1 text-white bg-red-600 hover:bg-red-700 rounded-md py-2 disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            Anular
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {rows.length === 0 && (
                        <div className="text-sm text-gray-500 text-center">Sin registros.</div>
                    )}
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block bg-white shadow-sm sm:rounded-lg overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {[
                                    '#',
                                    'Fecha',
                                    'Ítems',
                                    'Formas de pago',
                                    'Total',
                                    'Pagado',
                                    'Saldo',
                                    'Estado',
                                    'Acciones',
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((s) => {
                                const methods = paymentNames(s);
                                return (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">#{s.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {s.created_at
                                                ? new Date(s.created_at).toLocaleString('es-CO')
                                                : ''}
                                        </td>

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
                                                    {methods.map((n) => (
                                                        <span
                                                            key={n}
                                                            className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                                        >
                                                            {n}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            ${formatMoney(s.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            ${formatMoney(s.paid)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            ${formatMoney(s.balance)}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 rounded-full ${statusClass(s.status)}`}
                                            >
                                                {statusLabel(s.status)}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap space-x-3">
                                            {s.status !== 'pagado' && s.status !== 'anulada' && s.status !== 'gift' && (
                                                <button
                                                    onClick={() => beginPay(s)}
                                                    className="text-yellow-600 hover:text-yellow-900"
                                                >
                                                    Saldar Deuda
                                                </button>
                                            )}
                                            <Link
                                                href={route('sales.show', s.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Ver
                                            </Link>
                                            {isAdmin && s.status !== 'anulada' && (
                                                <button
                                                    onClick={() => cancelSale(s)}
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    disabled={submitting}
                                                >
                                                    Anular
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        className="px-6 py-4 text-sm text-gray-500"
                                        colSpan={9}
                                    >
                                        Sin registros.
                                    </td>
                                </tr>
                            )}
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
                                className={`px-3 py-1 rounded border ${link.active
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700'
                                    } ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
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
                            <Dialog.Title className="text-base md:text-lg font-bold">
                                Carrito
                            </Dialog.Title>
                            <button
                                onClick={() => setOpenCart(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 md:p-5 flex-1 overflow-y-auto md:max-h-[65vh]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {items.map((prod) => (
                                    <div
                                        key={prod.id}
                                        className="border p-3 md:p-4 rounded-lg"
                                    >
                                        <h3 className="font-semibold text-sm md:text-base">
                                            {prod.name ??
                                                prod.code ??
                                                `#${prod.id}`}
                                        </h3>
                                        <p className="text-xs md:text-sm text-gray-600">
                                            Stock: {fmtQty(prod.quantity)}
                                        </p>
                                        <p className="text-xs md:text-sm text-gray-600">
                                            Precio catálogo (unidad): $
                                            {formatMoney(prod.sale_price ?? 0)}
                                        </p>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="mt-3 w-full border px-2 py-2 rounded-md text-sm"
                                            placeholder="Precio total del ítem (opcional)"
                                            value={linePrice[prod.id] ?? ''}
                                            onChange={(e) =>
                                                setLinePrice((prev) => ({
                                                    ...prev,
                                                    [prod.id]: e.target.value,
                                                }))
                                            }
                                        />

                                        <div className="mt-3 flex items-stretch gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addQty(
                                                        prod.id,
                                                        -1,
                                                        prod.quantity
                                                    )
                                                }
                                                className="w-10 h-10 grid place-items-center bg-gray-100 rounded-md text-xl"
                                                aria-label="Restar"
                                            >
                                                −
                                            </button>

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
                                                onChange={(e) =>
                                                    setQty(
                                                        prod.id,
                                                        e.target.value,
                                                        prod.quantity
                                                    )
                                                }
                                                onBlur={() =>
                                                    commitQty(
                                                        prod.id,
                                                        prod.quantity
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addQty(
                                                        prod.id,
                                                        1,
                                                        prod.quantity
                                                    )
                                                }
                                                className="w-10 h-10 grid place-items-center bg-gray-100 rounded-md text-xl"
                                                aria-label="Sumar"
                                            >
                                                ＋
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 md:p-5 border-t sticky bottom-0 bg-white z-10">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 justify-between">
                                <div className="text-base md:text-lg font-semibold">
                                    Total: ${formatMoney(totalSum)}
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
            <Dialog
                open={openPay}
                onClose={() => {
                    if (openCustomerModal) return;
                    setOpenPay(false);
                }}
                className="relative z-50"
            >
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
                            <button
                                onClick={() => setOpenPay(false)}
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 md:p-5 flex-1 overflow-y-auto space-y-4">
                            {bulkFlow && (
                                <>
                                    <div>
                                        <label className="block text-sm">
                                            Celular cliente (opcional)
                                        </label>
                                        <div className="mt-1 flex gap-2">
                                            <div className="flex-1">
                                                <PhoneInput
                                                    country="co"
                                                    value={customerId}
                                                    onChange={(value) =>
                                                        setCustomerId(value)
                                                    }
                                                    inputClass="w-full"
                                                    inputStyle={{
                                                        width: '100%',
                                                        height: '40px',
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => lookupCustomer(customerId)}
                                                className="px-3 py-2 border rounded-md"
                                                disabled={lookupLoading}
                                            >
                                                {lookupLoading ? 'Buscando…' : 'Buscar'}
                                            </button>
                                        </div>
                                        {customer && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                Cliente: {customer.name} · {customer.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm">
                                            Dealer
                                        </label>
                                        <select
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={deliveryId}
                                            onChange={(e) =>
                                                setDeliveryId(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                — Sin dealer —
                                            </option>
                                            {deliverers.map((u) => (
                                                <option
                                                    key={u.id}
                                                    value={u.id}
                                                >
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm">
                                            Distancia (km)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={km}
                                            onChange={(e) =>
                                                setKm(e.target.value)
                                            }
                                            placeholder={
                                                deliveryId
                                                    ? '0.00'
                                                    : 'Selecciona un dealer'
                                            }
                                            disabled={!deliveryId}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Obligatorio solo si
                                            seleccionas un dealer.
                                        </p>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm">
                                    Método de pago
                                </label>
                                <select
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={methodId ?? ''}
                                    onChange={(e) =>
                                        setMethodId(
                                            Number(e.target.value)
                                        )
                                    }
                                >
                                    {paymentMethods.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm">Total</label>
                                <div className="mt-1 font-medium">
                                    ${formatMoney(
                                        bulkFlow
                                            ? totalAfterDiscount
                                            : selected?.total || 0
                                    )}
                                </div>
                            </div>

                            {bulkFlow && customer && pointValue > 0 && (
                                <div>
                                    <label className="block text-sm">
                                        Puntos disponibles
                                    </label>
                                    <div className="mt-1 text-sm text-gray-600">
                                        {Number(customer.points_balance ?? 0).toLocaleString('es-CO')} pts
                                        {' · '}Valor: ${Number(pointValue).toLocaleString('es-CO')} c/u
                                    </div>
                                    <div className="mt-2">
                                        <label className="block text-sm">
                                            Puntos a redimir
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pointsRedeem}
                                            onChange={(e) =>
                                                setPointsRedeem(() => {
                                                    const raw = Math.max(0, Number(e.target.value || 0));
                                                    const maxPts = Number(maxPointsRedeem || 0);
                                                    return Math.min(raw, maxPts);
                                                })
                                            }
                                        />
                                    </div>
                                    {pointsDiscount > 0 && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            Descuento por puntos: -$
                                            {Number(pointsDiscount).toLocaleString('es-CO')}
                                        </div>
                                    )}
                                    {maxPointsRedeem === 0 && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            No hay puntos disponibles para redimir en esta venta.
                                        </div>
                                    )}
                                </div>
                            )}

                            {!bulkFlow && selected && (
                                <div>
                                    <label className="block text-sm">
                                        Ya pagado
                                    </label>
                                <div className="mt-1">
                                        ${formatMoney(pd.paid)}
                                </div>
                            </div>
                            )}

                            <div>
                                <label
                                    htmlFor="pay"
                                    className="block text-sm"
                                >
                                    Monto a pagar ahora
                                </label>
                                <input
                                    id="pay"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={pd.pay}
                                    onChange={(e) =>
                                        setPd((d) => ({
                                            ...d,
                                            pay: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm">
                                    Referencia (opcional)
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 w-full border px-3 py-2 rounded-md"
                                    value={reference}
                                    onChange={(e) =>
                                        setReference(e.target.value)
                                    }
                                    placeholder="# transacción / voucher"
                                />
                            </div>

                            <div>
                                <label className="block text-sm">
                                    Saldo pendiente:
                                </label>
                                <div className="mt-1">
                                    ${formatMoney(newDue)}
                                </div>
                            </div>

                            {newDue > 0 && (
                                <>
                                    <div>
                                        <label className="block text-sm">
                                            Nombre deudor
                                        </label>
                                        <input
                                            name="customer_name"
                                            type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.name}
                                            onChange={(e) =>
                                                setPd((d) => ({
                                                    ...d,
                                                    name: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm">
                                            Teléfono deudor
                                        </label>
                                        <input
                                            name="customer_phone"
                                            type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.phone}
                                            onChange={(e) =>
                                                setPd((d) => ({
                                                    ...d,
                                                    phone: e.target.value,
                                                }))
                                            }
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
                                    className={`w-full md:w-auto px-4 py-3 md:py-2 text-white rounded-md ${submitting
                                            ? 'bg-gray-400'
                                            : 'bg-blue-600'
                                        }`}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? 'Procesando…'
                                        : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Dialog>

            {/* ===== Modal Crear Cliente ===== */}
            <Dialog open={openCustomerModal} onClose={() => setOpenCustomerModal(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">Registrar cliente</h3>
                            <button
                                type="button"
                                onClick={() => setOpenCustomerModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm">Nombre</label>
                            <input
                                type="text"
                                className="mt-1 w-full border px-3 py-2 rounded-md"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm">Celular</label>
                            <div className="mt-1">
                                <PhoneInput
                                    country="co"
                                    value={newCustomerPhone}
                                    onChange={(value) => setNewCustomerPhone(value)}
                                    inputClass="w-full"
                                    inputStyle={{
                                        width: '100%',
                                        height: '40px',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setOpenCustomerModal(false)}
                                className="px-4 py-2 border rounded-md"
                                disabled={lookupLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={createCustomer}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                                disabled={lookupLoading}
                            >
                                {lookupLoading ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
