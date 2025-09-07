import React, { useEffect, useMemo, useState } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Formato condicional: si la unidad es "gr" muestra hasta 3 decimales
const fmtQty = (n, unit) =>
    Number(n ?? 0).toLocaleString('es-CO', {
        minimumFractionDigits: unit === 'gr' ? 0 : 0,
        maximumFractionDigits: unit === 'gr' ? 3 : 0,
    });

export default function Index() {
    const { auth, errors, page, filters = {}, locations = [] } = usePage().props;

    const rows = page?.data ?? [];
    const links = page?.links ?? [];

    const [q, setQ] = useState(filters.q ?? '');
    const [belowMin, setBelowMin] = useState(Boolean(filters.below_min));
    const [perPage, setPerPage] = useState(Number(filters.per_page ?? 30));
    const [locationId, setLocationId] = useState(filters.location_id ?? '');

    // ¿Estado de filtros idéntico al del servidor?
    const sameAsServer =
        (q ?? '') === (filters.q ?? '') &&
        (belowMin ? 1 : 0) === (filters.below_min ? 1 : 0) &&
        Number(perPage) === Number(filters.per_page ?? 30) &&
        String(locationId ?? '') === String(filters.location_id ?? '');

    useEffect(() => {
        if (sameAsServer) return;
        const t = setTimeout(() => {
            const url = typeof route === 'function' ? route('stock.index') : '/stock';
            router.get(
                url,
                {
                    q,
                    per_page: perPage,
                    location_id: locationId || undefined,
                    below_min: belowMin ? 1 : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);
        return () => clearTimeout(t);
    }, [q, perPage, locationId, belowMin, sameAsServer]);

    // Totales del footer (visibles)
    const footer = useMemo(
        () =>
            rows.reduce(
                (a, r) => ({
                    on: a.on + Number(r.on_hand || 0),
                    rs: a.rs + Number(r.reserved || 0),
                    av: a.av + Number(r.available || 0),
                    mn: a.mn + Number(r.min_stock || 0),
                }),
                { on: 0, rs: 0, av: 0, mn: 0 }
            ),
        [rows]
    );

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl">Stock por ubicación</h2>}
        >
            <Head title="Stock · Ubicaciones" />

            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
                {/* Filtros (grid fluida) */}
                <div className="bg-white p-4 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input
                        className="border rounded-lg px-3 py-2 w-full"
                        placeholder="Buscar producto…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <select
                        className="border rounded-lg px-3 py-2 w-full"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                    >
                        <option value="">Todas las ubicaciones</option>
                        {Array.isArray(locations) &&
                            locations.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name} {l.type ? `(${l.type})` : ''}
                                </option>
                            ))}
                    </select>

                    <label className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer">
                        <input
                            id="belowMin"
                            type="checkbox"
                            className="accent-blue-600"
                            checked={belowMin}
                            onChange={(e) => setBelowMin(e.target.checked)}
                        />
                        <span className="text-sm">Solo bajo mínimo</span>
                    </label>

                    <div className="flex items-center justify-between sm:justify-start gap-3">
                        <span className="text-sm text-gray-500">Filas:</span>
                        <select
                            className="border rounded-lg px-3 py-2"
                            value={perPage}
                            onChange={(e) => setPerPage(Number(e.target.value))}
                        >
                            {[15, 30, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ===== Tarjetas en móvil (sm-) ===== */}
                <div className="space-y-3 sm:hidden">
                    {rows.length === 0 && (
                        <div className="rounded-xl border bg-white p-4 text-gray-500">
                            Sin registros.
                        </div>
                    )}

                    {rows.map((r) => {
                        const inv = r.inventory ?? {};
                        const loc = r.location ?? {};
                        const low = Number(r.available) < Number(r.min_stock);
                        return (
                            <div
                                key={r.id}
                                className={`rounded-xl border p-4 bg-white shadow-sm ${low ? 'ring-1 ring-red-200 bg-red-50/30' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">
                                            {inv.name}{' '}
                                            <span className="text-xs text-gray-500">({inv.unit?.toUpperCase()})</span>
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            SKU #{r.inventory_id}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Ubicación</p>
                                        <p className="text-sm">{loc.name}</p>
                                        <p className="text-[11px] text-gray-500">{loc.type}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-[11px] text-gray-500">Físico</p>
                                        <p className="font-medium">
                                            {fmtQty(r.on_hand, inv.unit)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-[11px] text-gray-500">Reservado</p>
                                        <p className="font-medium">
                                            {fmtQty(r.reserved, inv.unit)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3 col-span-2">
                                        <p className="text-[11px] text-gray-500">Disponible</p>
                                        <p
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${low ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}
                                        >
                                            {fmtQty(r.available, inv.unit)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3 col-span-2">
                                        <p className="text-[11px] text-gray-500">Mínimo</p>
                                        <p className="font-medium">
                                            {fmtQty(r.min_stock, inv.unit)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ===== Tabla en desktop (sm+) ===== */}
                <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {['Producto', 'Ubicación', 'Unidad', 'Físico', 'Reservado', 'Disponible', 'Mínimo'].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.length === 0 && (
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={7}>
                                        Sin registros.
                                    </td>
                                </tr>
                            )}

                            {rows.map((r) => {
                                const inv = r.inventory ?? {};
                                const loc = r.location ?? {};
                                const low = Number(r.available) < Number(r.min_stock);
                                return (
                                    <tr key={r.id} className={low ? 'bg-red-50' : ''}>
                                        <td className="px-4 lg:px-6 py-3">
                                            <div className="font-medium text-gray-900">{inv.name}</div>
                                            <div className="text-xs text-gray-500">SKU #{r.inventory_id}</div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">
                                            <div>{loc.name}</div>
                                            <div className="text-xs text-gray-500">{loc.type}</div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3 uppercase">{inv.unit}</td>
                                        <td className="px-4 lg:px-6 py-3">{fmtQty(r.on_hand, inv.unit)}</td>
                                        <td className="px-4 lg:px-6 py-3">{fmtQty(r.reserved, inv.unit)}</td>
                                        <td className="px-4 lg:px-6 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${low ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}
                                            >
                                                {fmtQty(r.available, inv.unit)}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-6 py-3">{fmtQty(r.min_stock, inv.unit)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* Footer totales (visibles) */}
                        {rows.length > 0 && (
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Totales visibles
                                    </th>
                                    <td />
                                    <td />
                                    <td className="px-4 lg:px-6 py-3 font-semibold">{fmtQty(footer.on, 'gr')}</td>
                                    <td className="px-4 lg:px-6 py-3 font-semibold">{fmtQty(footer.rs, 'gr')}</td>
                                    <td className="px-4 lg:px-6 py-3 font-semibold">{fmtQty(footer.av, 'gr')}</td>
                                    <td className="px-4 lg:px-6 py-3 font-semibold">{fmtQty(footer.mn, 'gr')}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Paginación */}
                {links.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="text-sm text-gray-500">{rows.length} ítems en esta página</div>
                        <div className="flex flex-wrap gap-2">
                            {links.map((l, i) => (
                                <Link
                                    key={i}
                                    href={l.url || '#'}
                                    preserveState
                                    preserveScroll
                                    className={`px-3 py-1.5 rounded-lg border text-sm
                    ${l.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}
                    ${!l.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
