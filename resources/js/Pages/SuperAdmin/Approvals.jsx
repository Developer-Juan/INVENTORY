import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-100 text-amber-700',
        pending_demo: 'bg-purple-100 text-purple-700',
        active_demo: 'bg-blue-100 text-blue-700',
        active_working: 'bg-green-100 text-green-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs ${map[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

export default function SuperAdminApprovals() {
    const { auth, pendingUsers = [], activeAdmins = [] } = usePage().props;

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Aprobaciones</h2>}
        >
            <Head title="Aprobaciones" />
            <div className="py-6">
                <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <StatusBadge status={u.status} />
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap space-x-3">
                                            <Link
                                                as="button"
                                                method="put"
                                                data={{ status: 'active_demo' }}
                                                preserveScroll
                                                href={route('super-admin.users.status', u.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Activar demo
                                            </Link>
                                            <Link
                                                as="button"
                                                method="put"
                                                data={{ status: 'active_working' }}
                                                preserveScroll
                                                href={route('super-admin.users.status', u.id)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                Activar cliente
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {pendingUsers.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={4}>
                                            Sin solicitudes pendientes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg overflow-auto">
                        <div className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Admins activos (demo / working)
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {activeAdmins.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <StatusBadge status={u.status} />
                                        </td>
                                    </tr>
                                ))}
                                {activeAdmins.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={3}>
                                            No hay admins activos.
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
