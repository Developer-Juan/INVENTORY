import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const statusLabels = {
    active: 'Activos (demo + working)',
    active_demo: 'Solo demo',
    active_working: 'Solo working',
};

export default function Broadcasts({ auth, customers = {}, filters = {} }) {
    const { flash = {} } = usePage().props;
    const rows = Array.isArray(customers) ? customers : (customers?.data ?? []);
    const links = Array.isArray(customers) ? [] : (customers?.links ?? []);
    const [selectedIds, setSelectedIds] = useState([]);
    const [sendAll, setSendAll] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'active');
    const form = useForm({
        subject: '',
        body: '',
        send_all: false,
        user_ids: [],
        status: filters.status || 'active',
        search: filters.search || '',
    });

    const visibleCustomers = useMemo(() => rows, [rows]);

    // Keep selection across pagination and filters.

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const applyFilters = (e) => {
        e.preventDefault();
        router.get(route('super-admin.broadcasts'), {
            status: statusFilter,
            search: search || undefined,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedIds(visibleCustomers.map((c) => c.id));
    };

    const clearSelection = () => {
        setSelectedIds([]);
    };

    const submit = (e) => {
        e.preventDefault();
        const ids = sendAll ? [] : selectedIds.map((id) => Number(id));
        form.setData({
            ...form.data,
            send_all: sendAll,
            user_ids: ids,
            status: statusFilter,
            search: search || '',
        });
        form.post(route('super-admin.broadcasts.send'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('subject', 'body');
                setSelectedIds([]);
                setSendAll(false);
                setSearch('');
                setStatusFilter('active');
            },
        });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Correos masivos</h2>}
        >
            <Head title="Correos masivos" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Envio a admins activos
                                </h3>
                            </div>
                        </div>

                        <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Buscar
                                        </label>
                                        <input
                                            type="text"
                                            className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                            placeholder="Nombre, email o teléfono"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Estado
                                        </label>
                                        <select
                                            className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                        <option value="active">Activos (demo + working)</option>
                                            <option value="active_demo">Solo demo</option>
                                            <option value="active_working">Solo working</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <button
                                            type="button"
                                            onClick={applyFilters}
                                            className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            Aplicar filtros
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Asunto
                                    </label>
                                    <input
                                        type="text"
                                        className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                        value={form.data.subject}
                                        onChange={(e) => form.setData('subject', e.target.value)}
                                    />
                                    {form.errors.subject && (
                                        <p className="mt-1 text-xs text-red-500">{form.errors.subject}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Mensaje
                                    </label>
                                    <textarea
                                        rows={8}
                                        className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                        value={form.data.body}
                                        onChange={(e) => form.setData('body', e.target.value)}
                                    />
                                    {form.errors.body && (
                                        <p className="mt-1 text-xs text-red-500">{form.errors.body}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Enviando...'
                                            : `Enviar correo${sendAll ? '' : ` (${selectedIds.length})`}`}
                                    </button>
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                                            checked={sendAll}
                                            onChange={(e) => setSendAll(e.target.checked)}
                                        />
                                        Enviar a todos los filtrados
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                        <span>Destinatarios</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={selectAll}
                                                className="text-indigo-600 dark:text-indigo-400"
                                            >
                                                Seleccionar todos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearSelection}
                                                className="text-gray-500 dark:text-gray-400"
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-auto divide-y divide-gray-100 dark:divide-gray-700">
                                        {visibleCustomers.length === 0 && (
                                            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                No hay admins activos para este filtro.
                                            </div>
                                        )}
                                        {visibleCustomers.map((c) => (
                                            <label
                                                key={c.id}
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(c.id)}
                                                    onChange={() => toggleSelect(c.id)}
                                                    disabled={sendAll}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-xs text-gray-500">{c.email || 'Sin email'}</div>
                                                </div>
                                                <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {c.status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {links.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {links.map((l, i) => (
                                            <a
                                                key={i}
                                                href={l.url || '#'}
                                                className={`px-3 py-1 rounded border text-xs ${
                                                    l.active
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                                                } ${!l.url ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: l.label }} />
                                            </a>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>Seleccionados: {selectedIds.length}</span>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
