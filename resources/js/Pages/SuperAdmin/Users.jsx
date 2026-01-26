import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const StatusBadge = ({ status }) => {
    const map = {
        active_demo: 'bg-blue-100 text-blue-700',
        active_working: 'bg-green-100 text-green-700',
        pending: 'bg-amber-100 text-amber-700',
        pending_demo: 'bg-purple-100 text-purple-700',
        suspended: 'bg-gray-200 text-gray-700',
        expired: 'bg-red-100 text-red-700',
        canceled: 'bg-slate-200 text-slate-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs ${map[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
};

export default function SuperAdminUsers() {
    const { auth, users = [] } = usePage().props;
    const [openEdit, setOpenEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const editForm = useForm({
        name: '',
        email: '',
        status: 'active_working',
        roles: ['admin'],
        password: '',
        password_confirmation: '',
    });

    const openEditModal = (user) => {
        setEditingId(user.id);
        editForm.setData({
            name: user.name || '',
            email: user.email || '',
            status: user.status || 'active_working',
            roles: (user.roles || []).map((r) => r.name),
            password: '',
            password_confirmation: '',
        });
        setOpenEdit(true);
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Super Admin</h2>}
        >
            <Head title="Super Admin - Usuarios" />
            <div className="py-6">
                <div className="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            {(u.roles || []).map((r) => (
                                                <span
                                                    key={r.id || r.name}
                                                    className="inline-flex items-center px-2 py-0.5 mr-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                                >
                                                    {r.name}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <StatusBadge status={u.status} />
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap space-x-3">
                                           
                                            <button
                                                type="button"
                                                className="text-indigo-600 hover:text-indigo-900"
                                                onClick={() => openEditModal(u)}
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                                            No hay usuarios admin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} className="fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 grid place-items-center p-4">
                    <div className="w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <Dialog.Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                            Editar usuario admin
                        </Dialog.Title>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!editingId || editForm.processing) return;
                                editForm.put(route('super-admin.users.update', editingId), {
                                    preserveScroll: true,
                                    onSuccess: () => setOpenEdit(false),
                                });
                            }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Nombre</label>
                                    <input
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                    />
                                    {editForm.errors.name && (
                                        <p className="text-xs text-red-600">{editForm.errors.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Email</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                    />
                                    {editForm.errors.email && (
                                        <p className="text-xs text-red-600">{editForm.errors.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Rol</label>
                                    <select
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.roles[0] || 'admin'}
                                        onChange={(e) => editForm.setData('roles', [e.target.value])}
                                    >
                                        <option value="admin">admin</option>
                                        <option value="super-admin">super-admin</option>
                                    </select>
                                    {editForm.errors.roles && (
                                        <p className="text-xs text-red-600">{editForm.errors.roles}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Estado</label>
                                    <select
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.status}
                                        onChange={(e) => editForm.setData('status', e.target.value)}
                                    >
                                        <option value="active_demo">active_demo</option>
                                        <option value="active_working">active_working</option>
                                        <option value="suspended">suspended</option>
                                        <option value="expired">expired</option>
                                        <option value="canceled">canceled</option>
                                    </select>
                                    {editForm.errors.status && (
                                        <p className="text-xs text-red-600">{editForm.errors.status}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Password</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.password}
                                        onChange={(e) => editForm.setData('password', e.target.value)}
                                    />
                                    {editForm.errors.password && (
                                        <p className="text-xs text-red-600">{editForm.errors.password}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 dark:text-gray-300">Confirmar</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                        value={editForm.data.password_confirmation}
                                        onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenEdit(false)}
                                    className="px-3 py-2 text-gray-700 dark:text-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded"
                                >
                                    {editForm.processing ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
