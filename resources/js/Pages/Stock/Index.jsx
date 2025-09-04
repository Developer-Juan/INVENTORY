import React, { useEffect, useMemo, useState } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmt = (n) => Number(n ?? 0).toLocaleString('es-CO');

export default function Index() {
    const { auth, errors, page, filters = {}, locations = [] } = usePage().props;

    const rows = page?.data ?? [];
    const links = page?.links ?? [];

    const [q, setQ] = useState(filters.q ?? '');
    const [belowMin, setBelowMin] = useState(Boolean(filters.below_min));
    const [perPage, setPerPage] = useState(Number(filters.per_page ?? 30));
    const [locationId, setLocationId] = useState(filters.location_id ?? '');

    // ¿El estado del cliente coincide con los filtros que llegaron del servidor?
    const sameAsServer =
        (q ?? '') === (filters.q ?? '') &&
        (belowMin ? 1 : 0) === (filters.below_min ? 1 : 0) &&
        Number(perPage) === Number(filters.per_page ?? 30) &&
        String(locationId ?? '') === String(filters.location_id ?? '');

    useEffect(() => {
        if (sameAsServer) return;

        const t = setTimeout(() => {
            // ⚠️ Usar router.get de @inertiajs/react (no Inertia.get)
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
                    // only: ['page','filters','locations'], // opcional si usas respuesta parcial
                }
            );
        }, 300);

        return () => clearTimeout(t);
    }, [q, perPage, locationId, belowMin, sameAsServer]);

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

            <div className="p-6 max-w-7xl mx-auto space-y-4">
                {/* Filtros */}
                <div className="bg-white p-4 rounded shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                        className="border rounded px-3 py-2 w-full"
                        placeholder="Buscar producto…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />

                    <div>
                        <select
                            className="border rounded px-2 py-2 w-full"
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
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="belowMin"
                            type="checkbox"
                            checked={belowMin}
                            onChange={(e) => setBelowMin(e.target.checked)}
                        />
                        <label htmlFor="belowMin" className="text-sm">
                            Solo bajo mínimo
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Filas:</span>
                        <select
                            className="border rounded px-2 py-2"
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

                {/* Tabla */}
                <div className="bg-white rounded shadow-sm overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Producto', 'Ubicación', 'Unidad', 'Físico', 'Reservado', 'Disponible', 'Mínimo'].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rows.map((r) => {
                                const inv = r.inventory ?? {};
                                const loc = r.location ?? {};
                                const low = Number(r.available) < Number(r.min_stock);
                                return (
                                    <tr key={r.id} className={low ? 'bg-red-50' : ''}>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900">{inv.name}</div>
                                            <div className="text-xs text-gray-500">SKU #{r.inventory_id}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div>{loc.name}</div>
                                            <div className="text-xs text-gray-500">{loc.type}</div>
                                        </td>
                                        <td className="px-6 py-3 uppercase">{inv.unit}</td>
                                        <td className="px-6 py-3">{fmt(r.on_hand)}</td>
                                        <td className="px-6 py-3">{fmt(r.reserved)}</td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs ${low ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}
                                            >
                                                {fmt(r.available)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">{fmt(r.min_stock)}</td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td className="px-6 py-4 text-sm text-gray-500" colSpan={7}>
                                        Sin registros.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* Footer totales visibles */}
                        {rows.length > 0 && (
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Totales visibles
                                    </th>
                                    <td />
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
