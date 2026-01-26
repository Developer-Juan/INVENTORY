import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { RiFileExcel2Line } from 'react-icons/ri';
import { FaRegFilePdf } from 'react-icons/fa6';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function SalesReport() {
    const { auth, errors = {}, deliverers = [], filters = {}, saleStatuses = {}, sales, totals } = usePage().props;

    const rows = Array.isArray(sales) ? sales : (sales?.data ?? []);
    const links = Array.isArray(sales) ? [] : (sales?.links ?? []);

    const [dealerId, setDealerId] = useState(filters.dealer_id ?? '');
    const [fromDate, setFromDate] = useState(filters.from_date ?? '');
    const [toDate, setToDate] = useState(filters.to_date ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    const buildQuery = () => ({
        dealer_id: dealerId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        status: status || undefined,
    });

    const applyFilters = (e) => {
        e.preventDefault();
        router.get(route('reports.sales'), buildQuery(), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const fmtMoney = (v) =>
        Number(v ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Reporte de ventas</h2>}
        >
            <Head title="Reporte de ventas" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
                <form
                    onSubmit={applyFilters}
                    className="bg-white dark:bg-slate-900/80 dark:border dark:border-slate-800 rounded-xl shadow p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dealer
                        </label>
                        <select
                            className="mt-1 w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Desde
                        </label>
                        <input
                            type="date"
                            className="mt-1 w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hasta
                        </label>
                        <input
                            type="date"
                            className="mt-1 w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Estado
                        </label>
                        <select
                            className="mt-1 w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </form>

                <div className="flex flex-wrap gap-3">
                    <a
                        href={route('reports.sales.excel', buildQuery())}
                        className="px-4 py-2 rounded border border-emerald-500/60 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 inline-flex items-center gap-2"
                    >
                        <RiFileExcel2Line className="h-4 w-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                        Exportar Excel
                    </a>
                    <a
                        href={route('reports.sales.pdf', buildQuery())}
                        className="px-4 py-2 rounded border border-rose-500/50 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-500/10 inline-flex items-center gap-2"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <FaRegFilePdf className="h-4 w-4 text-rose-500 dark:text-rose-400" aria-hidden="true" />
                        Exportar PDF
                    </a>
                </div>

                <div className="bg-white dark:bg-slate-900/80 dark:border dark:border-slate-800 rounded-xl shadow p-4">
                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-200">
                        <div>Total ventas: <b>{totals?.count ?? 0}</b></div>
                        <div>Total: <b>$ {fmtMoney(totals?.total ?? 0)}</b></div>
                        <div>Pagado: <b>$ {fmtMoney(totals?.paid ?? 0)}</b></div>
                        <div>Saldo: <b>$ {fmtMoney(totals?.balance ?? 0)}</b></div>
                    </div>

                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300">
                                <tr>
                                    <th className="px-4 py-2 text-left">ID</th>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                    <th className="px-4 py-2 text-left">Vendedor</th>
                                    <th className="px-4 py-2 text-left">Cliente</th>
                                    <th className="px-4 py-2 text-left">Estado</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                    <th className="px-4 py-2 text-right">Pagado</th>
                                    <th className="px-4 py-2 text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-gray-700 dark:text-slate-200">
                                {rows.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-4 py-2">#{sale.id}</td>
                                        <td className="px-4 py-2">
                                            {sale.created_at ? new Date(sale.created_at).toLocaleString('es-CO') : ''}
                                        </td>
                                        <td className="px-4 py-2">{sale.user?.name ?? ''}</td>
                                        <td className="px-4 py-2">{sale.customer_user?.name ?? sale.debtor_name ?? ''}</td>
                                        <td className="px-4 py-2">{sale.status}</td>
                                        <td className="px-4 py-2 text-right">$ {fmtMoney(sale.total)}</td>
                                        <td className="px-4 py-2 text-right">$ {fmtMoney(sale.paid)}</td>
                                        <td className="px-4 py-2 text-right">$ {fmtMoney(sale.balance)}</td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-4 text-center text-gray-500 dark:text-slate-400" colSpan={8}>
                                            Sin resultados para estos filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {links.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {links.map((l, i) => (
                                <Link
                                    key={i}
                                    href={l.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1 rounded border text-sm
                    ${l.active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'}
                    ${!l.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
