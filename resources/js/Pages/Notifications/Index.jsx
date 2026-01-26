import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO') : '—');

export default function NotificationsIndex({ auth, notifications, isAdmin, filters = {} }) {
    const items = notifications?.data ?? [];
    const form = useForm({ title: '', message: '' });
    const [activeFilter, setActiveFilter] = useState(filters.filter ?? 'all');

    const applyFilter = (value) => {
        setActiveFilter(value);
        router.get(route('notifications.index'), { filter: value }, { preserveScroll: true, preserveState: true });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Notificaciones</h2>}
        >
            <Head title="Notificaciones" />
            <div className="p-4 sm:p-6 max-w-5xl mx-auto">
                {isAdmin && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Nueva notificación para dealers</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!form.data.title || !form.data.message) return;
                                form.post(route('notifications.dealers.store'), {
                                    preserveScroll: true,
                                    onSuccess: () => form.reset(),
                                });
                            }}
                            className="space-y-3"
                        >
                            <input
                                className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="Título"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                            />
                            <textarea
                                className="w-full border rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                rows={3}
                                placeholder="Mensaje (horarios, puntos de entrega, etc.)"
                                value={form.data.message}
                                onChange={(e) => form.setData('message', e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
                                >
                                    Enviar a dealers
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                        {[
                            { key: 'all', label: 'Todas' },
                            { key: 'tickets', label: 'Tickets' },
                            { key: 'admin_requests', label: 'Nuevos admins' },
                        ].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => applyFilter(item.key)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    activeFilter === item.key
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.length === 0 && (
                            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                                Sin notificaciones.
                            </div>
                        )}
                        {items.map((n) => (
                            (() => {
                                const isTicket = n.type === 'support_ticket_new' && n.ticket_id;
                                const body = (
                                    <>
                                        <div className="mt-1">
                                            {!n.read_at && <span className="h-2 w-2 rounded-full bg-red-500 block" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-sm ${!n.read_at ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
                                                {n.title ? `${n.title} — ${n.message}` : (n.message || 'Notificación')}
                                            </div>
                                            {n.type === 'low_stock' && (
                                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                                    {n.inventory_name} · {n.location_name} · Disponible: {n.available} {n.unit ?? ''} · Mínimo: {n.min_stock}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {fmtDate(n.created_at)}
                                            </div>
                                        </div>
                                    </>
                                );
                                const cls = `px-4 py-4 flex gap-3 ${!n.read_at ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`;
                                return isTicket ? (
                                    <a
                                        key={n.id}
                                        href={route('support.index', { ticket_id: n.ticket_id })}
                                        className={`${cls} hover:bg-gray-100 dark:hover:bg-gray-700`}
                                    >
                                        {body}
                                    </a>
                                ) : (
                                    <div key={n.id} className={cls}>
                                        {body}
                                    </div>
                                );
                            })()
                        ))}
                    </div>
                </div>

                {notifications?.links && (
                    <div className="mt-4 flex justify-center">
                        <div className="flex gap-2">
                            {notifications.links.map((link) => (
                                <a
                                    key={link.url || link.label}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded border text-sm ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'} ${link.url ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-50 pointer-events-none'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
