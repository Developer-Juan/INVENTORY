// resources/js/Pages/Stock/Summary.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmt = (n) => Number(n ?? 0).toLocaleString('es-CO');

export default function Summary() {
    const { auth, errors, page, filters = {} } = usePage().props;
    const rows = page?.data ?? [];
    const links = page?.links ?? [];

    const [q, setQ] = useState(filters.q ?? '');
    const [belowMin, setBelowMin] = useState(!!filters.below_min);
    const [perPage, setPerPage] = useState(Number(filters.per_page ?? 30));

    // ¿Estado del cliente coincide con filtros del servidor?
    const sameAsServer =
        (q ?? '') === (filters.q ?? '') &&
        (belowMin ? 1 : 0) === (filters.below_min ? 1 : 0) &&
        Number(perPage) === Number(filters.per_page ?? 30);

    useEffect(() => {
        if (sameAsServer) return;

        const t = setTimeout(() => {
            const url = typeof route === 'function' ? route('stock.summary') : '/stock/summary';
            router.get(
                url,
                {
                    q,
                    below_min: belowMin ? 1 : undefined,
                    per_page: perPage,
                },
                {
                    preserveState: true,
                    replace: true,
                    // preserveScroll: true,
                    // only: ['page', 'filters'], // si usas respuesta parcial
                }
            );
        }, 300);

        return () => clearTimeout(t);
    }, [q, belowMin, perPage, sameAsServer]);

    const footer = useMemo(
        () =>
            rows.reduce(
                (a, r) => ({
                    on: a.on + Number(r.on_hand_total || 0),
                    rs: a.rs + Number(r.reserved_total || 0),
                    av: a.av + Number(r.available_total || 0),
                    mn: a.mn + Number(r.min_stock_total || 0),
                }),
                { on: 0, rs: 0, av: 0, mn: 0 }
            ),
        [rows]
    );

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl">Stock (Totales por SKU)</h2>}
        >
            <Head title="Stock · Totales" />

            <div className="p-6 max-w-7xl mx-auto space-y-4">
                {/* Filtros */}
                <div className="bg-white p-4 rounded shadow-sm flex flex-col sm:flex-row gap-3">
                    <input
                        className="border rounded px-3 py-2 w-full sm:w-72"
                        placeholder="Buscar producto…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={belowMin}
                            onChange={(e) => setBelowMin(e.target.checked)}
                        />
                        <span>Solo bajo mínimo</span>
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Filas:</span>
                        <select
                            className="border rounded px-2 py-1"
                            value={perPage}
                            onChange={(e) => setPerPage(Number(e.target.value))}
                        >
                            {[15, 30, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded shadow-sm overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Producto', 'Unidad', 'Físico', 'Reservado', 'Disponible', 'Mínimo'].map((h) => (
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
                            {rows.map((r) => {
                                const low = Number(r.available_total) < Number(r.min_stock_total);
                                return (
                                    <tr key={r.inventory_id} className={low ? 'bg-red-50' : ''}>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">{r.name}</div>
                                            <div className="text-xs text-gray-500">SKU #{r.inventory_id}</div>
                                        </td>
                                        <td className="px-6 py-3 uppercase">{r.unit}</td>
                                        <td className="px-6 py-3">{fmt(r.on_hand_total)}</td>
                                        <td className="px-6 py-3">{fmt(r.reserved_total)}</td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs ${low ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}
                                            >
                                                {fmt(r.available_total)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">{fmt(r.min_stock_total)}</td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>
                                        Sin registros.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {rows.length > 0 && (
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Totales visibles
                                    </th>
                                    <td />
                                    <td className="px-6 py-3 font-semibold">{fmt(footer.on)}</td>
                                    <td className="px-6 py-3 font-semibold">{fmt(footer.rs)}</td>
                                    <td className="px-6 py-3 font-semibold">{fmt(footer.av)}</td>
                                    <td className="px-6 py-3 font-semibold">{fmt(footer.mn)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Paginación */}
                {links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {links.map((l, i) => (
                            <Link
                                key={i}
                                href={l.url || '#'}
                                preserveState
                                preserveScroll
                                className={`px-3 py-1 rounded border text-sm
                  ${l.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}
                  ${!l.url ? 'opacity-50 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: l.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
