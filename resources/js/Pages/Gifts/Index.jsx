// resources/js/Pages/Gifts/Index.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import toast from 'react-hot-toast';

export default function GiftsIndex() {
    const { auth, errors = {}, flash = {}, items = [], dealerLocations = [], rewards = [] } = usePage().props;

    const [recipientType, setRecipientType] = useState('customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [customerError, setCustomerError] = useState('');
    const [dealerLocationId, setDealerLocationId] = useState('');
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cart, setCart] = useState({});

    const normalizePhone = (value) => String(value ?? '').replace(/\D+/g, '');

    const cartItems = useMemo(() => {
        return Object.entries(cart)
            .map(([id, qty]) => ({
                inventory_id: Number(id),
                quantity: Number(qty || 0),
            }))
            .filter((it) => it.inventory_id > 0 && it.quantity > 0);
    }, [cart]);

    const setQty = (id, value) => {
        if (value === '') {
            setCart((prev) => ({ ...prev, [id]: '' }));
            return;
        }
        const n = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(n)) return;
        setCart((prev) => ({ ...prev, [id]: n }));
    };

    async function lookupCustomer() {
        const phone = normalizePhone(customerPhone);
        if (phone.length < 7 || phone.length > 15) {
            setCustomerError('Ingresa un número válido (7–15 dígitos).');
            setCustomer(null);
            return;
        }
        setCustomerError('');
        setLoadingLookup(true);
        try {
            const res = await fetch(route('gifts.customer.lookup', { phone }), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            if (!data?.found) {
                setCustomer(null);
                setCustomerError('Cliente no encontrado.');
                return;
            }
            if (!data?.eligible) {
                setCustomer(null);
                setCustomerError('El cliente aún no tiene compras registradas.');
                return;
            }
            setCustomer({
                id: data.user?.id,
                name: data.user?.name,
                phone: data.user?.phone,
                points: data.user?.points_balance ?? 0,
            });
        } catch (e) {
            console.error(e);
            setCustomer(null);
            setCustomerError('No se pudo consultar el cliente.');
        } finally {
            setLoadingLookup(false);
        }
    }

    function submitGift(e) {
        e.preventDefault();
        if (cartItems.length === 0) {
            alert('Agrega al menos un ítem.');
            return;
        }
        if (recipientType === 'customer') {
            if (!customer?.id) {
                setCustomerError('Debes buscar un cliente válido.');
                return;
            }
        } else {
            if (!dealerLocationId) {
                alert('Selecciona un dealer.');
                return;
            }
        }

        const payload = {
            recipient_type: recipientType,
            customer_phone: recipientType === 'customer' ? normalizePhone(customerPhone) : null,
            dealer_location_id: recipientType === 'dealer' ? Number(dealerLocationId) : null,
            items: cartItems,
        };

        setSubmitting(true);
        router.post(route('gifts.store'), payload, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
            onSuccess: () => {
                setCart({});
                setCustomer(null);
                setCustomerPhone('');
                setDealerLocationId('');
            },
        });
    }

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (errors && Object.keys(errors).length > 0) {
            const msgs = Object.values(errors)
                .flatMap((v) => (Array.isArray(v) ? v : [v]))
                .filter(Boolean);
            if (msgs.length) toast.error(msgs.join('\n'));
        }
    }, [flash, errors]);

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800">Regalos</h2>}
        >
            <Head title="Regalos" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="font-semibold mb-3">Destinatario</h3>

                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="recipient_type"
                                value="customer"
                                checked={recipientType === 'customer'}
                                onChange={() => {
                                    setRecipientType('customer');
                                    setDealerLocationId('');
                                }}
                            />
                            Cliente
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="recipient_type"
                                value="dealer"
                                checked={recipientType === 'dealer'}
                                onChange={() => {
                                    setRecipientType('dealer');
                                    setCustomer(null);
                                    setCustomerPhone('');
                                    setCustomerError('');
                                }}
                            />
                            Dealer
                        </label>
                    </div>

                    {recipientType === 'customer' ? (
                        <div className="space-y-2">
                            <label className="block text-sm">Celular del cliente</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1">
                                    <PhoneInput
                                        country="co"
                                        value={customerPhone}
                                        onChange={(value) => setCustomerPhone(value)}
                                        inputClass="w-full"
                                        inputStyle={{ width: '100%', height: '40px' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={lookupCustomer}
                                    className="px-4 py-2 rounded-md border"
                                    disabled={loadingLookup}
                                >
                                    {loadingLookup ? 'Buscando…' : 'Buscar'}
                                </button>
                            </div>
                            {customerError && (
                                <div className="text-sm text-red-600">{customerError}</div>
                            )}
                            {customer && (
                                <div className="text-sm text-gray-700">
                                    Cliente: {customer.name} · {customer.phone}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm">Dealer</label>
                            <select
                                className="mt-1 w-full border px-3 py-2 rounded-md"
                                value={dealerLocationId}
                                onChange={(e) => setDealerLocationId(e.target.value)}
                            >
                                <option value="">— Selecciona —</option>
                                {dealerLocations.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.user?.name ? `${d.user.name} — ` : ''}{d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {recipientType === 'customer' && customer && (
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-semibold mb-3">Redenciones disponibles</h3>
                        {Number(customer.points || 0) > 0 ? (
                            <div className="space-y-2 text-sm text-gray-700">
                                <div className="text-gray-600">
                                    Puntos del cliente: {Number(customer.points || 0).toLocaleString('es-CO')}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {rewards.map((r) => (
                                        <div key={r.id} className="border rounded-lg p-3">
                                            <div className="font-semibold">{r.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {Number(r.points_required ?? 0).toLocaleString('es-CO')} pts
                                            </div>
                                            {r.description && (
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {r.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {rewards.length === 0 && (
                                        <div className="text-sm text-gray-500">Sin redenciones activas.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">
                                El cliente no tiene puntos disponibles.
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="font-semibold mb-3">Ítems del regalo</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((it) => {
                            const unit = String(it.unit ?? '').toLowerCase();
                            const isPieces = ['pcs', 'pieza', 'piezas', 'unidad', 'unidades'].includes(unit);
                            const step = isPieces ? 1 : 0.5;
                            return (
                                <div key={it.id} className="border rounded-lg p-3">
                                    <div className="font-semibold text-sm">{it.name ?? `#${it.id}`}</div>
                                    <div className="text-xs text-gray-600">
                                        Stock: {Number(it.quantity ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 3 })}
                                        {it.unit ? ` ${it.unit}` : ''}
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step={step}
                                        className="mt-2 w-full border px-2 py-2 rounded-md text-sm"
                                        placeholder="Cantidad"
                                        value={cart[it.id] ?? ''}
                                        onChange={(e) => setQty(it.id, e.target.value)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={submitGift}
                        className="px-4 py-2 rounded-md bg-green-600 text-white"
                        disabled={submitting}
                    >
                        {submitting ? 'Guardando…' : 'Crear regalo'}
                    </button>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
