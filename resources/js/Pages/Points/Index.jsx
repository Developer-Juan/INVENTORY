// resources/js/Pages/Points/Index.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import toast from 'react-hot-toast';
import { confirmToast } from '@/Components/ConfirmToast';

export default function Index({ settings, rewards = [], pointsUsers = [], filters = {} }) {
    const { auth, errors = {} } = usePage().props;
    const isAdmin = useMemo(() => {
        const rolesRaw = auth?.user?.roles ?? auth?.roles ?? [];
        const roles = Array.isArray(rolesRaw)
            ? rolesRaw.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
            : [];
        return roles.includes('admin') || roles.includes('super-admin');
    }, [auth]);
    const [pointsQuery, setPointsQuery] = useState(filters.q ?? '');
    const pointRows = Array.isArray(pointsUsers) ? pointsUsers : (pointsUsers?.data ?? []);
    const pointLinks = Array.isArray(pointsUsers) ? [] : (pointsUsers?.links ?? []);

    function applyPointsFilter(e) {
        e.preventDefault();
        const query = {};
        if (pointsQuery) query.q = pointsQuery;
        router.get(route('points.index'), query, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearPointsFilter() {
        setPointsQuery('');
        router.get(route('points.index'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    const settingsForm = useForm({
        value_per_point: settings?.value_per_point ?? 0,
        redemption_info: settings?.redemption_info ?? '',
    });

    const [createForm, setCreateForm] = useState({
        name: '',
        points_required: '',
        description: '',
        is_active: true,
    });

    const rewardEdits = useMemo(() => {
        const map = {};
        rewards.forEach((r) => {
            map[r.id] = {
                name: r.name ?? '',
                points_required: r.points_required ?? 0,
                description: r.description ?? '',
                is_active: !!r.is_active,
            };
        });
        return map;
    }, [rewards]);
    const [rewardState, setRewardState] = useState(rewardEdits);
    useEffect(() => {
        setRewardState(rewardEdits);
    }, [rewardEdits]);

    function saveSettings(e) {
        e.preventDefault();
        settingsForm.post(route('points.settings.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success('Configuración guardada'),
        });
    }

    function createReward(e) {
        e.preventDefault();
        router.post(route('points.rewards.store'), createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setCreateForm({
                    name: '',
                    points_required: '',
                    description: '',
                    is_active: true,
                });
                toast.success('Redención creada');
            },
        });
    }

    function updateReward(id) {
        const data = rewardState[id];
        router.put(route('points.rewards.update', id), data, {
            preserveScroll: true,
            onSuccess: () => toast.success('Redención actualizada'),
        });
    }

    function deleteReward(id) {
        confirmToast({
            message: '¿Eliminar redención?',
            confirmText: 'Eliminar',
            onConfirm: () => {
                router.delete(route('points.rewards.destroy', id), {
                    preserveScroll: true,
                    onSuccess: () => toast.success('Redención eliminada'),
                });
            },
        });
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800">Puntos</h2>}
        >
            <Head title="Puntos" />

            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-3">Configuración</h3>
                    <form onSubmit={saveSettings} className="grid gap-4">
                        <div>
                            <label className="block text-sm">Valor por punto</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 w-full border px-3 py-2 rounded-md"
                                value={settingsForm.data.value_per_point}
                                onChange={(e) =>
                                    settingsForm.setData('value_per_point', e.target.value)
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm">¿En qué se puede redimir?</label>
                            <textarea
                                className="mt-1 w-full border px-3 py-2 rounded-md"
                                rows={3}
                                value={settingsForm.data.redemption_info}
                                onChange={(e) =>
                                    settingsForm.setData('redemption_info', e.target.value)
                                }
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                                disabled={settingsForm.processing}
                            >
                                {settingsForm.processing ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-semibold mb-3">Configuración de redenciones</h3>

                    <form onSubmit={createReward} className="grid md:grid-cols-4 gap-3 mb-6">
                        <input
                            type="text"
                            className="border px-3 py-2 rounded-md"
                            placeholder="Nombre"
                            value={createForm.name}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, name: e.target.value }))
                            }
                        />
                        <input
                            type="number"
                            min="1"
                            className="border px-3 py-2 rounded-md"
                            placeholder="Puntos"
                            value={createForm.points_required}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, points_required: e.target.value }))
                            }
                        />
                        <input
                            type="text"
                            className="border px-3 py-2 rounded-md"
                            placeholder="Descripción"
                            value={createForm.description}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, description: e.target.value }))
                            }
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md"
                        >
                            Crear
                        </button>
                    </form>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rewards.map((r) => (
                            <div key={r.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                <div className="text-xs text-gray-500 mb-1">Redención #{r.id}</div>
                                <input
                                    type="text"
                                    className="w-full border px-2 py-1 rounded-md mb-2"
                                    value={rewardState[r.id]?.name ?? ''}
                                    onChange={(e) =>
                                        setRewardState((s) => ({
                                            ...s,
                                            [r.id]: {
                                                ...s[r.id],
                                                name: e.target.value,
                                            },
                                        }))
                                    }
                                />
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full border px-2 py-1 rounded-md mb-2"
                                    value={rewardState[r.id]?.points_required ?? 0}
                                    onChange={(e) =>
                                        setRewardState((s) => ({
                                            ...s,
                                            [r.id]: {
                                                ...s[r.id],
                                                points_required: e.target.value,
                                            },
                                        }))
                                    }
                                />
                                <input
                                    type="text"
                                    className="w-full border px-2 py-1 rounded-md mb-2"
                                    value={rewardState[r.id]?.description ?? ''}
                                    onChange={(e) =>
                                        setRewardState((s) => ({
                                            ...s,
                                            [r.id]: {
                                                ...s[r.id],
                                                description: e.target.value,
                                            },
                                        }))
                                    }
                                />
                                <label className="flex items-center gap-2 text-sm mb-3">
                                    <input
                                        type="checkbox"
                                        checked={!!rewardState[r.id]?.is_active}
                                        onChange={(e) =>
                                            setRewardState((s) => ({
                                                ...s,
                                                [r.id]: {
                                                    ...s[r.id],
                                                    is_active: e.target.checked,
                                                },
                                            }))
                                        }
                                    />
                                    Activo
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateReward(r.id)}
                                        className="px-3 py-1 border rounded-md"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteReward(r.id)}
                                        className="px-3 py-1 border rounded-md text-red-600"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && (
                            <p className="text-sm text-gray-500">Sin redenciones.</p>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Usuarios y puntos</h3>
                            <div className="text-xs text-gray-500">
                                {pointRows.length} registros
                            </div>
                        </div>

                        <form onSubmit={applyPointsFilter} className="mb-3 flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                className="flex-1 border px-3 py-2 rounded-md"
                                placeholder="Filtrar por nombre"
                                value={pointsQuery}
                                onChange={(e) => setPointsQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 rounded-md bg-blue-600 text-white"
                            >
                                Buscar
                            </button>
                            <button
                                type="button"
                                onClick={clearPointsFilter}
                                className="px-4 py-2 rounded-md border"
                            >
                                Limpiar
                            </button>
                        </form>

                        <div className="overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Usuario', 'Contacto', 'Puntos'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-2 text-left font-medium text-gray-600"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {pointRows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-2">
                                                {row.user?.name ?? `#${row.user_id}`}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">
                                                {row.user?.phone || row.user?.email || '—'}
                                            </td>
                                            <td className="px-4 py-2 font-semibold">
                                                {Number(row.points_balance ?? 0).toLocaleString('es-CO')}
                                            </td>
                                        </tr>
                                    ))}
                                    {pointRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-6 text-center text-gray-500"
                                            >
                                                Sin usuarios con puntos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pointLinks.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {pointLinks.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-3 py-1 rounded border text-sm
                                            ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}
                                            ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
