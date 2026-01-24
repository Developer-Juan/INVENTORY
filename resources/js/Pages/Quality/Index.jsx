// resources/js/Pages/Quality/Index.jsx
import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import toast from 'react-hot-toast';

export default function QualityIndex() {
    const {
        auth,
        errors = {},
        tokens = [],
        reviews = [],
        isAdmin = false,
        dealers = [],
        filters = {},
        rankingByDealer = [],
        rankingByProduct = [],
    } = usePage().props;

    const [dealerId, setDealerId] = React.useState(filters.dealer_id ?? '');

    const copyLink = async (token) => {
        const url = route('quality.public', token);
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copiado');
        } catch {
            toast.error('No se pudo copiar el link');
        }
    };

    const regenToken = (saleId) => {
        router.post(route('quality.token.create', saleId), {}, { preserveScroll: true });
    };

    const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO') : '—');

    const applyFilters = (e) => {
        e.preventDefault();
        const query = {};
        if (dealerId) query.dealer_id = dealerId;
        router.get(route('quality.index'), query, { preserveScroll: true, preserveState: true });
    };

    const clearFilters = () => {
        setDealerId('');
        router.get(route('quality.index'), {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800">Calidad de servicio</h2>}
        >
            <Head title="Calidad de servicio" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                {isAdmin && (
                    <div className="bg-white rounded-xl shadow p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Rankings</h3>
                        </div>
                        <form onSubmit={applyFilters} className="mb-4 flex flex-col sm:flex-row gap-2">
                            <select
                                className="flex-1 border px-3 py-2 rounded-md"
                                value={dealerId}
                                onChange={(e) => setDealerId(e.target.value)}
                            >
                                <option value="">— Todos los dealers —</option>
                                {dealers.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">
                                Filtrar
                            </button>
                            <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-md border">
                                Limpiar
                            </button>
                        </form>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="border rounded-lg p-3">
                                <div className="font-semibold mb-2">Ranking por dealer</div>
                                <div className="overflow-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Dealer</th>
                                                <th className="px-3 py-2 text-right">Promedio</th>
                                                <th className="px-3 py-2 text-right">#</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {rankingByDealer.map((r) => (
                                                <tr key={r.dealer_user_id}>
                                                    <td className="px-3 py-2">{r.dealer?.name ?? '—'}</td>
                                                    <td className="px-3 py-2 text-right">{r.avg_rating}</td>
                                                    <td className="px-3 py-2 text-right">{r.total}</td>
                                                </tr>
                                            ))}
                                            {rankingByDealer.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-3 text-gray-500 text-center">
                                                        Sin calificaciones.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="border rounded-lg p-3">
                                <div className="font-semibold mb-2">Ranking por producto</div>
                                <div className="overflow-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Producto</th>
                                                <th className="px-3 py-2 text-right">Promedio</th>
                                                <th className="px-3 py-2 text-right">#</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {rankingByProduct.map((r, i) => (
                                                <tr key={`${r.inventory_id}-${i}`}>
                                                    <td className="px-3 py-2">{r.name}</td>
                                                    <td className="px-3 py-2 text-right">{r.avg_rating}</td>
                                                    <td className="px-3 py-2 text-right">{r.total}</td>
                                                </tr>
                                            ))}
                                            {rankingByProduct.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-3 text-gray-500 text-center">
                                                        Sin calificaciones.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Calificaciones</h3>
                        <div className="text-xs text-gray-500">{reviews.length} registros</div>
                    </div>

                    <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Venta', 'Dealer', 'Cliente', 'Rating', 'Comentario', 'Fecha'].map((h) => (
                                        <th key={h} className="px-4 py-2 text-left font-medium text-gray-600">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reviews.map((r) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2">#{r.sale?.id ?? '—'}</td>
                                        <td className="px-4 py-2">{r.dealer?.name ?? '—'}</td>
                                        <td className="px-4 py-2">
                                            {r.sale?.customer_user?.name ?? '—'}
                                            {r.sale?.customer_user?.phone ? ` · ${r.sale.customer_user.phone}` : ''}
                                        </td>
                                        <td className="px-4 py-2">{r.rating_dealer}</td>
                                        <td className="px-4 py-2">{r.comment ?? '—'}</td>
                                        <td className="px-4 py-2">{fmtDate(r.created_at)}</td>
                                    </tr>
                                ))}
                                {reviews.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                                            Sin calificaciones.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Links de calificación</h3>
                        <div className="text-xs text-gray-500">{tokens.length} registros</div>
                    </div>

                    <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Venta', 'Dealer', 'Cliente', 'Estado', 'Expira', 'Acciones'].map((h) => (
                                        <th key={h} className="px-4 py-2 text-left font-medium text-gray-600">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {tokens.map((t) => {
                                    const expired = t.expires_at && new Date(t.expires_at) < new Date();
                                    const used = !!t.used_at;
                                    return (
                                        <tr key={t.id}>
                                            <td className="px-4 py-2">#{t.sale?.id ?? '—'}</td>
                                            <td className="px-4 py-2">{t.dealer?.name ?? '—'}</td>
                                            <td className="px-4 py-2">
                                                {t.sale?.customer_user?.name ?? '—'}
                                                {t.sale?.customer_user?.phone ? ` · ${t.sale.customer_user.phone}` : ''}
                                            </td>
                                            <td className="px-4 py-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                                        used
                                                            ? 'bg-green-100 text-green-800'
                                                            : expired
                                                                ? 'bg-gray-200 text-gray-700'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                                >
                                                    {used ? 'Calificada' : expired ? 'Expirada' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{fmtDate(t.expires_at)}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyLink(t.token)}
                                                        className="px-3 py-1 border rounded-md"
                                                    >
                                                        Copiar link
                                                    </button>
                                                    {(expired || used) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => regenToken(t.sale?.id)}
                                                            className="px-3 py-1 border rounded-md"
                                                        >
                                                            Generar nuevo
                                                        </button>
                                                    )}
                                                    {isAdmin && t.sale?.id && (
                                                        <Link
                                                            href={route('sales.show', t.sale.id)}
                                                            className="px-3 py-1 border rounded-md text-indigo-700"
                                                        >
                                                            Ver venta
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tokens.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-gray-500 text-center">
                                            Sin links.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
