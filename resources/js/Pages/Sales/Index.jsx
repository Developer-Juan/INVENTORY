// resources/js/Pages/Sales/Index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

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

    const rows = Array.isArray(sales) ? sales : (sales?.data ?? []);
    const links = Array.isArray(sales) ? [] : (sales?.links ?? []);

    // ===== Carrito =====
    const [openCart, setOpenCart] = useState(false);
    const [cart, setCart] = useState({});           // { [inventoryId]: qty | '' }  (qty puede ser decimal)
    const [linePrice, setLinePrice] = useState({}); // precio TOTAL de la línea
    const [cartItems, setCartItems] = useState([]);
    const [bulkFlow, setBulkFlow] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    // ===== Helpers cantidad (decimales paso 0.5) =====
    const STEP = 0.5;
    const clampFloat = (n, min, max) => Math.max(min, Math.min(max, n));
    const snapToStep = (n, step = STEP) => Math.round(n / step) * step;
    const normalizeDecimal = (raw) => {
        if (raw === '' || raw === null || raw === undefined) return '';
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
        if (raw === '') return setCart(prev => ({ ...prev, [id]: '' }));
        const n = normalizeDecimal(raw);
        if (n === '') return;
        const limited = clampFloat(n, 0, Number(max ?? 0));
        setCart(prev => ({ ...prev, [id]: limited }));
    };

    const commitQty = (id, max) => {
        setCart(prev => {
            const raw = prev[id];
            if (raw === '' || raw === undefined) return { ...prev, [id]: '' };
            let n = normalizeDecimal(raw);
            if (n === '') n = 0;
            n = snapToStep(n);
            n = clampFloat(n, 0, Number(max ?? 0));
            if (n > 0 && n < STEP) n = STEP;
            return { ...prev, [id]: n };
        });
    };

    function addQty(id, delta, max) {
        setCart(prev => {
            const cur = normalizeDecimal(prev[id] ?? 0) || 0;
            const next = cur === 0 && delta > 0 ? STEP : cur + (delta * STEP);
            const snapped = snapToStep(next);
            const limited = clampFloat(snapped, 0, Number(max ?? 0));
            return { ...prev, [id]: limited };
        });
    }

    // Total carrito
    const totalSum = useMemo(() => {
        return Object.entries(cart).reduce((acc, [id, qtyRaw]) => {
            const prod = items.find(x => x.id === Number(id));
            if (!prod) return acc;

            let qty = normalizeDecimal(qtyRaw ?? 0) || 0;
            qty = snapToStep(qty);
            qty = clampFloat(qty, 0, Number(prod.quantity ?? 0));
            if (qty <= 0) return acc;

            const override = linePrice[id];
            const lineTotal = override !== undefined && override !== ''
                ? Number(override)
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
            const currentBalance = Number(
                selected.balance ?? Math.max(0, (selected.total ?? 0) - (selected.paid ?? 0))
            );
            setNewDue(Math.max(0, currentBalance - Number(pd.pay || 0)));
        } else {
            setNewDue(0);
        }
    }, [pd.pay, totalSum, bulkFlow, selected]);

    useEffect(() => {
        if (!deliveryId) setKm('');
    }, [deliveryId]);

    function doCheckout() {
        const lines = Object.entries(cart)
            .map(([i, qtyRaw]) => {
                const prod = items.find(x => x.id === Number(i));
                if (!prod) return null;

                let qty = normalizeDecimal(qtyRaw ?? 0) || 0;
                qty = snapToStep(qty);
                qty = clampFloat(qty, 0, Number(prod.quantity ?? 0));
                if (qty > 0 && qty < STEP) qty = STEP;
                if (qty < STEP) return null;

                const override = linePrice[i];
                const hasOverride = override !== undefined && override !== '' && Number(override) > 0;
                const lineTotal = hasOverride ? Number(override) : Number(prod.sale_price ?? 0) * qty;
                if (!(lineTotal > 0)) return null;

                const unit = lineTotal / qty;
                const unitPrice = hasOverride ? parseFloat(unit.toFixed(2)) : null;

                return {
                    inventory_id: Number(i),
                    quantity: parseFloat(qty.toFixed(3)),
                    unit_price: unitPrice,
                    total_price: parseFloat(lineTotal.toFixed(2)),
                    discount: 0,
                };
            })
            .filter(Boolean);

        if (!lines.length) {
            toast.error('Agrega productos con total > 0');
            return;
        }

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
        setReference(''); setBulkFlow(false); setOpenPay(true);
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
            if (customerId !== '' && customerId !== null && customerId !== undefined) {
                const n = Number(customerId);
                if (!Number.isFinite(n) || n < 0 || n > 9999)
                    return toast.error('ID de cliente inválido (0–9999)');
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
            if (hasDelivery) {
                payload.delivery_id = Number(deliveryId);
                payload.km = kmVal;
            }

            router.post(
                route('sales.store'),
                payload,
                {
                    preserveScroll: true,
                    onStart: () => setSubmitting(true),
                    onFinish: () => setSubmitting(false),
                    onSuccess: () => {
                        setOpenPay(false);
                        setCart({});
                        setLinePrice({});
                        setDeliveryId(''); setKm('');
                        toast.success('Venta creada correctamente');
                    },
                    onError: (errs) => {
                        console.error('Sales.store validation errors:', errs);
                        showErrors(errs);
                    },
                }
            );
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
                onError: (errs) => {
                    console.error('Sales.payments.store validation errors:', errs);
                    showErrors(errs);
                },
            }
        );
    }

    return (
        <AuthenticatedLayout auth={auth} errors={errors} header={<h2 className="font-semibold text-xl">Ventas</h2>}>
            <Head title="Ventas" />

            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                {errors && Object.keys(errors).length > 0 && (
                    <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
                        <ul className="list-disc pl-5">
                            {Object.entries(errors).map(([k, v]) => (
                                Array.isArray(v)
                                    ? v.map((m, i) => <li key={`${k}-${i}`}><b>{k}</b>: {m}</li>)
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

                {/* Cards en móvil, tabla en >= md */}
                {/* Cards (mobile-first) */}
                <div className="md:hidden space-y-3">
                    {rows.map(s => (
                        <div key={s.id} className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">#{s.id}</div>
                                <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'pagado' ? 'bg-green-100 text-green-800'
                                    : s.status === 'parcial' ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>{s.status}</span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                                {s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : ''}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-gray-500">Ítems:</span> {s.items_count ?? s.items?.length ?? '-'}</div>
                                <div><span className="text-gray-500">Total:</span> ${Number(s.total).toLocaleString('es-CO')}</div>
                                <div><span className="text-gray-500">Pagado:</span> ${Number(s.paid).toLocaleString('es-CO')}</div>
                                <div><span className="text-gray-500">Saldo:</span> ${Number(s.balance).toLocaleString('es-CO')}</div>
                            </div>
                            <div className="mt-3 flex gap-3">
                                {s.status !== 'pagado' && (
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
                            </div>
                        </div>
                    ))}
                    {rows.length === 0 && (
                        <div className="text-sm text-gray-500 text-center">Sin registros.</div>
                    )}
                </div>

                {/* Tabla (desktop) */}
                <div className="hidden md:block bg-white shadow-sm sm:rounded-lg overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {['#', 'Fecha', 'Ítems', 'Total', 'Pagado', 'Saldo', 'Estado', 'Acciones'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">#{s.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{s.items_count ?? s.items?.length ?? '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">${Number(s.total).toLocaleString('es-CO')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">${Number(s.paid).toLocaleString('es-CO')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">${Number(s.balance).toLocaleString('es-CO')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full ${s.status === 'pagado' ? 'bg-green-100 text-green-800'
                                            : s.status === 'parcial' ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>{s.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap space-x-3">
                                        {s.status !== 'pagado' && (
                                            <button onClick={() => beginPay(s)} className="text-yellow-600 hover:text-yellow-900">
                                                Saldar Deuda
                                            </button>
                                        )}
                                        <Link href={route('sales.show', s.id)} className="text-indigo-600 hover:text-indigo-900">Ver</Link>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td className="px-6 py-4 text-sm text-gray-500" colSpan={8}>Sin registros.</td></tr>
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
                                className={`px-3 py-1 rounded border ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Carrito */}
            <Dialog open={openCart} onClose={() => setOpenCart(false)} className="fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 grid place-items-center p-0 sm:p-4">
                    <div className="relative z-50 bg-white h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full sm:w-full sm:max-w-4xl sm:rounded-xl shadow-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                            <Dialog.Title className="text-base sm:text-lg font-bold">Carrito</Dialog.Title>
                            <button onClick={() => setOpenCart(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="px-4 sm:px-6 py-4 overflow-y-auto h-[calc(100dvh-160px)] sm:h-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {items.map(prod => (
                                    <div key={prod.id} className="border p-3 sm:p-4 rounded-lg">
                                        <h3 className="font-semibold text-sm sm:text-base">{prod.name}</h3>
                                        <p className="text-xs sm:text-sm text-gray-600">Stock: {fmtQty(prod.quantity)}</p>
                                        <p className="text-xs sm:text-sm text-gray-600">
                                            Precio catálogo (unidad): ${Number(prod.sale_price ?? 0).toLocaleString('es-CO')}
                                        </p>

                                        {/* Precio TOTAL del ítem */}
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="mt-2 w-full border px-2 py-2 rounded-md text-sm"
                                            placeholder="Precio total del ítem (opcional)"
                                            value={linePrice[prod.id] ?? ''}
                                            onChange={e => setLinePrice(prev => ({ ...prev, [prod.id]: e.target.value }))}
                                        />

                                        {/* Cantidad + botones */}
                                        <div className="mt-2 flex items-stretch gap-2">
                                            <button
                                                type="button"
                                                onClick={() => addQty(prod.id, -1, prod.quantity)}
                                                className="w-10 h-10 sm:w-9 sm:h-9 grid place-items-center bg-gray-100 rounded-md text-xl"
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
                                                onChange={e => setQty(prod.id, e.target.value, prod.quantity)}
                                                onBlur={() => commitQty(prod.id, prod.quantity)}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => addQty(prod.id, 1, prod.quantity)}
                                                className="w-10 h-10 sm:w-9 sm:h-9 grid place-items-center bg-gray-100 rounded-md text-xl"
                                                aria-label="Sumar"
                                            >
                                                ＋
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer fijo en móvil */}
                        <div className="px-4 sm:px-6 py-3 border-t bg-white sticky bottom-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
                                <div className="text-base sm:text-lg font-semibold">
                                    Total: ${Number(totalSum).toLocaleString('es-CO')}
                                </div>
                                <button
                                    onClick={doCheckout}
                                    className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-md"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* Modal Pago / Deuda / Crear venta */}
            <Dialog open={openPay} onClose={() => setOpenPay(false)} className="fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 grid place-items-center p-0 sm:p-4">
                    <form
                        onSubmit={submitPay}
                        className="relative z-50 bg-white h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full sm:w-full sm:max-w-xl sm:rounded-xl shadow-xl overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                            <Dialog.Title className="text-base sm:text-lg font-bold">
                                {bulkFlow ? 'Pago Carrito' : 'Saldar Deuda'}
                            </Dialog.Title>
                            <button onClick={() => setOpenPay(false)} type="button" className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 space-y-4">
                            {bulkFlow && (
                                <>
                                    <div>
                                        <label className="block text-sm">ID Cliente (4 dígitos, opcional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="9999"
                                            step="1"
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
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={km}
                                            onChange={e => setKm(e.target.value)}
                                            placeholder={deliveryId ? '0.00' : 'Selecciona un dealer'}
                                            disabled={!deliveryId}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Obligatorio solo si seleccionas un dealer.
                                        </p>
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
                                    id="pay"
                                    type="number"
                                    step="0.01"
                                    min="0"
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
                                            name="customer_name"
                                            type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.name}
                                            onChange={e => setPd(d => ({ ...d, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm">Teléfono deudor</label>
                                        <input
                                            name="customer_phone"
                                            type="text"
                                            className="mt-1 w-full border px-3 py-2 rounded-md"
                                            value={pd.phone}
                                            onChange={e => setPd(d => ({ ...d, phone: e.target.value }))}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-4 sm:px-6 py-3 border-t bg-white">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOpenPay(false)}
                                    className="w-full sm:w-auto px-4 py-3 sm:py-2 border rounded-md"
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`w-full sm:w-auto px-4 py-3 sm:py-2 text-white rounded-md ${submitting ? 'bg-gray-400' : 'bg-blue-600'}`}
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
