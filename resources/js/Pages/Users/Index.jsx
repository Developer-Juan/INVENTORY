import React, { useEffect, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const Badge = ({ children }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 mr-1">
        {children}
    </span>
);

export default function UsersIndex() {
    const {
        auth,
        errors: pageErrors,
        users: payload,
        roles = [],
        locations = [],
        flash = {},
    } = usePage().props;

    // normaliza paginator
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
    const links = Array.isArray(payload) ? [] : payload?.links ?? [];

    // toasts
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error || 'Ocurrió un error');
    }, [flash]);

    // modales/estado
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // form crear (incluye crear nueva location)
    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [],
        location_id: '',
        create_location: false,
        new_location_name: '',
    });

    // form editar (password opcional)
    const editForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [],
        location_id: '',
    });

    // borrar
    const delForm = useForm({});

    // abrir modal editar
    function onOpenEdit(u) {
        setEditingId(u.id);
        const locId = u.location_id ?? u.location?.id ?? '';
        editForm.setData({
            name: u.name || '',
            email: u.email || '',
            password: '',
            password_confirmation: '',
            roles: (u.roles || []).map((r) => r.name),
            location_id: locId,
        });
        setOpenEdit(true);
    }

    // toggle de roles (reutilizable)
    function onToggleRole(form, roleName) {
        const has = form.data.roles.includes(roleName);
        form.setData(
            'roles',
            has ? form.data.roles.filter((r) => r !== roleName) : [...form.data.roles, roleName],
        );
    }

    // acciones
    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route('users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setOpenCreate(false);
                createForm.reset();
            },
        });
    }

    function submitEdit(e) {
        e.preventDefault();
        editForm.put(route('users.update', editingId), {
            preserveScroll: true,
            onSuccess: () => setOpenEdit(false),
        });
    }

    function destroyUser(id) {
        if (!confirm('¿Eliminar este usuario?')) return;
        delForm.delete(route('users.destroy', id), { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={pageErrors}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Usuarios</h2>}
        >
            <Head title="Usuarios" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-4 flex justify-between">
                        <button
                            onClick={() => setOpenCreate(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded shadow"
                        >
                            + Nuevo usuario
                        </button>
                    </div>

                    {/* ===== Cards (mobile) ===== */}
                    <div className="grid gap-3 sm:hidden">
                        {rows.length === 0 && (
                            <div className="rounded border bg-white dark:bg-gray-800 p-4 text-gray-500">
                                Sin usuarios.
                            </div>
                        )}
                        {rows.map((u) => (
                            <div key={u.id} className="rounded-xl border bg-white dark:bg-gray-800 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{u.name}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">{u.email}</div>
                                    </div>
                                    <div className="flex gap-3 shrink-0">
                                        <button
                                            onClick={() => onOpenEdit(u)}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => destroyUser(u.id)}
                                            className="text-red-600 hover:underline"
                                            disabled={delForm.processing}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2">
                                    {(u.roles || []).length === 0 ? (
                                        <span className="text-xs text-gray-400">Sin roles</span>
                                    ) : (
                                        <div className="mt-1 flex flex-wrap">
                                            {(u.roles || []).map((r) => (
                                                <Badge key={r.id || r.name}>{r.name}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                    <span className="text-gray-500 dark:text-gray-400">Ubicación: </span>
                                    {u.location?.name ?? '—'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ===== Tabla (sm+) ===== */}
                    <div className="hidden sm:block bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/30 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Roles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Ubicación</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {rows.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            {(u.roles || []).length === 0 && (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                            {(u.roles || []).map((r) => (
                                                <Badge key={r.id || r.name}>{r.name}</Badge>
                                            ))}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                            {u.location?.name ?? '—'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap space-x-3">
                                            <button
                                                onClick={() => onOpenEdit(u)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => destroyUser(u.id)}
                                                className="text-red-600 hover:text-red-900"
                                                disabled={delForm.processing}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                                            Sin usuarios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {links.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {links.map((l, i) => (
                                <Link
                                    key={i}
                                    href={l.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1 rounded border text-sm
                    ${l.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'}
                    ${!l.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} className="fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 grid place-items-center p-4">
                    <div className="w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <Dialog.Title className="text-lg font-semibold mb-4">Nuevo usuario</Dialog.Title>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm">Nombre</label>
                                    <input
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                    />
                                    {createForm.errors.name && <p className="text-xs text-red-600">{createForm.errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm">Email</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={createForm.data.email}
                                        onChange={(e) => createForm.setData('email', e.target.value)}
                                    />
                                    {createForm.errors.email && <p className="text-xs text-red-600">{createForm.errors.email}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm">Password</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={createForm.data.password}
                                        onChange={(e) => createForm.setData('password', e.target.value)}
                                    />
                                    {createForm.errors.password && <p className="text-xs text-red-600">{createForm.errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm">Confirmación</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={createForm.data.password_confirmation}
                                        onChange={(e) => createForm.setData('password_confirmation', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Ubicación existente o crear nueva */}
                            <div className="space-y-2">
                                <label className="block text-sm">Ubicación (dealer)</label>

                                <select
                                    className="mt-1 w-full border rounded px-3 py-2"
                                    value={createForm.data.location_id}
                                    onChange={(e) => createForm.setData('location_id', e.target.value)}
                                    disabled={createForm.data.create_location}
                                    title={createForm.data.create_location ? 'Desactiva "Crear nueva" para usar el listado' : ''}
                                >
                                    <option value="">— Ninguna —</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                                {createForm.errors.location_id && (
                                    <p className="text-xs text-red-600">{createForm.errors.location_id}</p>
                                )}

                                <label className="inline-flex items-center gap-2 text-sm mt-2">
                                    <input
                                        type="checkbox"
                                        checked={createForm.data.create_location}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            createForm.setData({
                                                ...createForm.data,
                                                create_location: checked,
                                                location_id: checked ? '' : createForm.data.location_id,
                                            });
                                        }}
                                    />
                                    <span>Crear nueva ubicación para este usuario</span>
                                </label>

                                {createForm.data.create_location && (
                                    <input
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        placeholder="Nombre de la nueva ubicación (p. ej. Dealer Juan)"
                                        value={createForm.data.new_location_name}
                                        onChange={(e) => createForm.setData('new_location_name', e.target.value)}
                                    />
                                )}
                                {createForm.errors.new_location_name && (
                                    <p className="text-xs text-red-600">{createForm.errors.new_location_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm mb-1">Roles</label>
                                <div className="flex flex-wrap gap-3">
                                    {roles.map((r) => (
                                        <label key={r} className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={createForm.data.roles.includes(r)}
                                                onChange={() => onToggleRole(createForm, r)}
                                            />
                                            <span>{r}</span>
                                        </label>
                                    ))}
                                </div>
                                {createForm.errors.roles && (
                                    <p className="text-xs text-red-600">{createForm.errors.roles}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setOpenCreate(false)} className="px-3 py-2">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing}
                                    className="px-4 py-2 bg-green-600 text-white rounded"
                                >
                                    {createForm.processing ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} className="fixed inset-0 z-50">
                <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                <div className="fixed inset-0 grid place-items-center p-4">
                    <div className="w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <Dialog.Title className="text-lg font-semibold mb-4">Editar usuario</Dialog.Title>
                        <form onSubmit={submitEdit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm">Nombre</label>
                                    <input
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                    />
                                    {editForm.errors.name && <p className="text-xs text-red-600">{editForm.errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm">Email</label>
                                    <input
                                        type="email"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                    />
                                    {editForm.errors.email && <p className="text-xs text-red-600">{editForm.errors.email}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm">Password (opcional)</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={editForm.data.password}
                                        onChange={(e) => editForm.setData('password', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm">Confirmación</label>
                                    <input
                                        type="password"
                                        className="mt-1 w-full border rounded px-3 py-2"
                                        value={editForm.data.password_confirmation}
                                        onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm">Ubicación (dealer)</label>
                                <select
                                    className="mt-1 w-full border rounded px-3 py-2"
                                    value={editForm.data.location_id}
                                    onChange={(e) => editForm.setData('location_id', e.target.value)}
                                >
                                    <option value="">— Ninguna —</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                                {editForm.errors.location_id && (
                                    <p className="text-xs text-red-600">{editForm.errors.location_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm mb-1">Roles</label>
                                <div className="flex flex-wrap gap-3">
                                    {roles.map((r) => (
                                        <label key={r} className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={editForm.data.roles.includes(r)}
                                                onChange={() => onToggleRole(editForm, r)}
                                            />
                                            <span>{r}</span>
                                        </label>
                                    ))}
                                </div>
                                {editForm.errors.roles && (
                                    <p className="text-xs text-red-600">{editForm.errors.roles}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setOpenEdit(false)} className="px-3 py-2">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded"
                                >
                                    {editForm.processing ? 'Actualizando…' : 'Actualizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
