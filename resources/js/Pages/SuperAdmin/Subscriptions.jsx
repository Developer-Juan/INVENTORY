import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import toast from 'react-hot-toast';

const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
};

const SwitchButton = ({ checked, onChange, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
    >
        <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </span>
        <span>{label}</span>
    </button>
);

export default function Subscriptions() {
    const { auth, plans = [], admins = [], flash = {} } = usePage().props;
    const [editingId, setEditingId] = useState(null);

    const planForm = useForm({
        name: '',
        duration_days: 30,
        price: 0,
        badge_color: 'indigo',
        is_demo: false,
        is_active: true,
    });

    const editForm = useForm({
        name: '',
        duration_days: 30,
        price: 0,
        badge_color: 'indigo',
        is_demo: false,
        is_active: true,
    });

    const assignForm = useForm({
        user_id: '',
        plan_id: '',
        starts_at: '',
    });

    const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const formatDate = (value) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    };

    const startEdit = (plan) => {
        setEditingId(plan.id);
        editForm.setData({
            name: plan.name || '',
            duration_days: plan.duration_days || 1,
            price: plan.price || 0,
            badge_color: plan.badge_color || 'indigo',
            is_demo: !!plan.is_demo,
            is_active: !!plan.is_active,
        });
    };

    const submitPlan = (e) => {
        e.preventDefault();
        planForm.post(route('super-admin.subscriptions.plans.store'), {
            onSuccess: () => planForm.reset(),
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        editForm.put(route('super-admin.subscriptions.plans.update', editingId), {
            onSuccess: () => setEditingId(null),
        });
    };

    const submitAssign = (e) => {
        e.preventDefault();
        assignForm.post(route('super-admin.subscriptions.assign'), {
            onSuccess: () => assignForm.reset(),
        });
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Suscripciones</h2>}
        >
            <Head title="Suscripciones" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Crear plan</h3>
                        <form onSubmit={submitPlan} className="mt-4 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Nombre</label>
                                <input
                                    type="text"
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={planForm.data.name}
                                    onChange={(e) => planForm.setData('name', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Duracion (dias)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={planForm.data.duration_days}
                                    onChange={(e) => planForm.setData('duration_days', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Precio</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={planForm.data.price}
                                    onChange={(e) => planForm.setData('price', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Color badge</label>
                                <select
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={planForm.data.badge_color}
                                    onChange={(e) => planForm.setData('badge_color', e.target.value)}
                                >
                                    {Object.keys(colorClasses).map((key) => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <SwitchButton
                                    checked={planForm.data.is_demo}
                                    onChange={(value) => planForm.setData('is_demo', value)}
                                    label="Demo"
                                />
                                <SwitchButton
                                    checked={planForm.data.is_active}
                                    onChange={(value) => planForm.setData('is_active', value)}
                                    label="Activo"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                                    disabled={planForm.processing}
                                >
                                    Crear plan
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Planes</h3>
                        <div className="mt-4 space-y-3">
                            {plans.map((plan) => (
                                <div key={plan.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    {editingId === plan.id ? (
                                        <form onSubmit={submitEdit} className="grid gap-3 md:grid-cols-3">
                                            <input
                                                type="text"
                                                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                                value={editForm.data.name}
                                                onChange={(e) => editForm.setData('name', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                min="1"
                                                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                                value={editForm.data.duration_days}
                                                onChange={(e) => editForm.setData('duration_days', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                                value={editForm.data.price}
                                                onChange={(e) => editForm.setData('price', e.target.value)}
                                            />
                                            <select
                                                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                                value={editForm.data.badge_color}
                                                onChange={(e) => editForm.setData('badge_color', e.target.value)}
                                            >
                                                {Object.keys(colorClasses).map((key) => (
                                                    <option key={key} value={key}>{key}</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-4">
                                                <SwitchButton
                                                    checked={editForm.data.is_demo}
                                                    onChange={(value) => editForm.setData('is_demo', value)}
                                                    label="Demo"
                                                />
                                                <SwitchButton
                                                    checked={editForm.data.is_active}
                                                    onChange={(value) => editForm.setData('is_active', value)}
                                                    label="Activo"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button type="submit" className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700">Guardar</button>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${colorClasses[plan.badge_color] || colorClasses.indigo}`}>
                                                        {plan.name}
                                                    </span>
                                                    {plan.is_demo && (
                                                        <span className="text-xs text-gray-500">Demo</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                    {plan.duration_days} dias · ${Number(plan.price).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="text-sm text-gray-500">{plan.is_active ? 'Activo' : 'Inactivo'}</div>
                                            <button
                                                type="button"
                                                onClick={() => startEdit(plan)}
                                                className="text-indigo-600 dark:text-indigo-400 text-sm"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {plans.length === 0 && (
                                <p className="text-sm text-gray-500">No hay planes creados.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asignar suscripcion</h3>
                        <form onSubmit={submitAssign} className="mt-4 grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin</label>
                                <select
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={assignForm.data.user_id}
                                    onChange={(e) => assignForm.setData('user_id', e.target.value)}
                                >
                                    <option value="">Selecciona...</option>
                                    {admins.map((admin) => (
                                        <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Plan</label>
                                <select
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={assignForm.data.plan_id}
                                    onChange={(e) => assignForm.setData('plan_id', e.target.value)}
                                >
                                    <option value="">Selecciona...</option>
                                    {activePlans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Inicio (opcional)</label>
                                <input
                                    type="date"
                                    className="mt-2 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                                    value={assignForm.data.starts_at}
                                    onChange={(e) => assignForm.setData('starts_at', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                                    disabled={assignForm.processing}
                                >
                                    Asignar
                                </button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Admins con suscripcion activa</h4>
                            <div className="mt-3 overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/30">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Admin</th>
                                            <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Estado</th>
                                            <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Plan</th>
                                            <th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Vence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {admins.map((admin) => (
                                            <tr key={admin.id}>
                                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{admin.name}</td>
                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{admin.status}</td>
                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                                    {admin.active_subscription?.plan?.name || '—'}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                                    {formatDate(admin.active_subscription?.ends_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        {admins.length === 0 && (
                                            <tr>
                                                <td className="px-4 py-4 text-gray-500" colSpan={4}>No hay admins.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
