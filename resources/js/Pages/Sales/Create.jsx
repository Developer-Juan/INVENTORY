import React, { useEffect, useMemo, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import axios from 'axios';

export default function Create({ paymentMethods }) {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: '',
        discount: 0,
        tax: 0,
        items: [],       // {inventory_id, name, unit, unit_price, quantity, discount, stock}
        payments: [],    // {payment_method_id, amount, reference}
    });

    // Buscar productos (debounce simple)
    useEffect(() => {
        const t = setTimeout(() => {
            if (!term) return setResults([]);
            setSearching(true);
            axios.get(route('inventories.search'), { params: { term } })
                .then(res => setResults(res.data))
                .finally(() => setSearching(false));
        }, 350);
        return () => clearTimeout(t);
    }, [term]);

    // Agregar al carrito
    const addItem = (it) => {
        const exists = data.items.find(x => x.inventory_id === it.id);
        if (exists) {
            changeQty(it.id, exists.quantity + 1);
            return;
        }
        setData('items', [
            ...data.items,
            {
                inventory_id: it.id,
                name: it.name,
                unit: it.unit,
                unit_price: Number(it.price ?? 0),
                quantity: 1,
                discount: 0,
                stock: it.stock,
            }
        ]);
    };

    const removeItem = (inventory_id) => {
        setData('items', data.items.filter(x => x.inventory_id !== inventory_id));
    };

    const changeQty = (inventory_id, qty) => {
        setData('items', data.items.map(x => {
            if (x.inventory_id !== inventory_id) return x;
            const q = Math.max(1, parseInt(qty || 1, 10));
            return { ...x, quantity: q };
        }));
    };

    const changeDiscount = (inventory_id, disc) => {
        setData('items', data.items.map(x => {
            if (x.inventory_id !== inventory_id) return x;
            const d = Math.max(0, Number(disc || 0));
            return { ...x, discount: d };
        }));
    };

    // Totales en cliente (servidor recalcula igual)
    const subtotal = useMemo(() =>
        data.items.reduce((acc, it) => acc + Math.max(0, (it.quantity * it.unit_price) - (it.discount || 0)), 0)
        , [data.items]);

    const total = useMemo(() =>
        Math.max(0, subtotal - Number(data.discount || 0) + Number(data.tax || 0))
        , [subtotal, data.discount, data.tax]);

    const paid = useMemo(() =>
        (data.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0)
        , [data.payments]);

    const balance = useMemo(() => Number((total - paid).toFixed(2)), [total, paid]);

    // pagos
    const addPayment = () => {
        setData('payments', [
            ...data.payments,
            { payment_method_id: paymentMethods[0]?.id ?? null, amount: 0, reference: '' }
        ]);
    };

    const removePayment = (idx) => {
        setData('payments', data.payments.filter((_, i) => i !== idx));
    };

    const updatePayment = (idx, field, value) => {
        setData('payments', data.payments.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const submit = (e) => {
        e.preventDefault();
        if (!data.items.length) return alert('Agrega al menos un producto.');
        post(route('sales.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setTerm('');
                reset('items', 'payments', 'discount', 'tax', 'customer_id');
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Nueva Venta</h1>

            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna izquierda: buscador + carrito */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Buscador */}
                    <div className="p-4 border rounded">
                        <label className="block font-medium mb-2">Buscar producto</label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            placeholder="Nombre o SKU"
                            value={term}
                            onChange={e => setTerm(e.target.value)}
                        />
                        {searching && <div className="text-sm mt-2">Buscando...</div>}
                        {!!results.length && (
                            <div className="mt-3 max-h-56 overflow-auto border rounded">
                                {results.map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => addItem(r)}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">{r.name}</div>
                                            <div className="text-xs text-gray-500">SKU: {r.sku} • Stock: {r.stock} • {r.unit}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">${Number(r.price ?? 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Carrito */}
                    <div className="p-4 border rounded">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-semibold">Carrito</h2>
                            <span className="text-sm text-gray-500">{data.items.length} ítems</span>
                        </div>

                        {!data.items.length ? (
                            <div className="text-sm text-gray-500">Sin productos aún.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Producto</th>
                                        <th className="text-right">Precio</th>
                                        <th className="text-center">Cant</th>
                                        <th className="text-right">Desc</th>
                                        <th className="text-right">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map(it => {
                                        const line = Math.max(0, (it.quantity * it.unit_price) - (it.discount || 0));
                                        return (
                                            <tr key={it.inventory_id} className="border-b">
                                                <td className="py-2">
                                                    <div className="font-medium">{it.name}</div>
                                                    <div className="text-xs text-gray-500">Stock: {it.stock} • {it.unit}</div>
                                                </td>
                                                <td className="text-right">${Number(it.unit_price).toFixed(2)}</td>
                                                <td className="text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-20 border rounded px-2 py-1 text-right"
                                                        value={it.quantity}
                                                        onChange={e => changeQty(it.inventory_id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 border rounded px-2 py-1 text-right"
                                                        value={it.discount}
                                                        onChange={e => changeDiscount(it.inventory_id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="text-right">${line.toFixed(2)}</td>
                                                <td className="text-right">
                                                    <button type="button" className="text-red-600" onClick={() => removeItem(it.inventory_id)}>
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Columna derecha: totales + pagos */}
                <div className="space-y-4">
                    <div className="p-4 border rounded space-y-3">
                        <label className="block text-sm">Cliente (ID)</label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2"
                            value={data.customer_id}
                            onChange={e => setData('customer_id', e.target.value)}
                            placeholder="Opcional"
                        />

                        <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span className="font-semibold">${subtotal.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Descuento global</span>
                            <input
                                type="number" min="0" step="0.01"
                                className="w-28 border rounded px-2 py-1 text-right"
                                value={data.discount}
                                onChange={e => setData('discount', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Impuesto</span>
                            <input
                                type="number" min="0" step="0.01"
                                className="w-28 border rounded px-2 py-1 text-right"
                                value={data.tax}
                                onChange={e => setData('tax', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between text-lg">
                            <span>Total</span>
                            <span className="font-bold">${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Pagos */}
                    <div className="p-4 border rounded space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Pagos</h3>
                            <button type="button" className="text-blue-600" onClick={addPayment}>+ Agregar pago</button>
                        </div>

                        {!data.payments.length ? (
                            <div className="text-sm text-gray-500">Sin pagos aún (queda en debe).</div>
                        ) : (
                            <div className="space-y-2">
                                {data.payments.map((p, idx) => (
                                    <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                                        <select
                                            className="col-span-2 border rounded px-2 py-2"
                                            value={p.payment_method_id ?? ''}
                                            onChange={e => updatePayment(idx, 'payment_method_id', Number(e.target.value))}
                                        >
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>

                                        <input
                                            type="number" min="0.01" step="0.01"
                                            className="col-span-2 border rounded px-2 py-2 text-right"
                                            value={p.amount}
                                            onChange={e => updatePayment(idx, 'amount', e.target.value)}
                                            placeholder="Monto"
                                        />

                                        <input
                                            type="text"
                                            className="col-span-1 border rounded px-2 py-2"
                                            value={p.reference || ''}
                                            onChange={e => updatePayment(idx, 'reference', e.target.value)}
                                            placeholder="Ref."
                                        />

                                        <button type="button" className="col-span-1 text-red-600" onClick={() => removePayment(idx)}>
                                            Quitar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span>Pagado</span>
                            <span className="font-semibold">${paid.toFixed(2)}</span>
                        </div>
                        <div className={`flex items-center justify-between ${balance > 0 ? 'text-orange-600' : 'text-green-700'}`}>
                            <span>Saldo</span>
                            <span className="font-semibold">${balance.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.items.length}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
                    >
                        {processing ? 'Guardando…' : 'Confirmar venta'}
                    </button>

                    {errors && Object.keys(errors).length > 0 && (
                        <div className="text-sm text-red-600">
                            {Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
