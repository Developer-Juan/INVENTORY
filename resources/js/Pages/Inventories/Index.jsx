// resources/js/Pages/Inventories/Index.jsx
import React, { useEffect, useState } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { Dialog } from '@headlessui/react';
import { Inertia } from '@inertiajs/inertia';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index() {
    const { items: payload, principalId, auth, errors, flash = {} } = usePage().props;

    const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
    const links = Array.isArray(payload) ? [] : (payload?.links ?? []);

    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editItemId, setEditItemId] = useState(null);

    const money = (v) =>
        v == null
            ? '—'
            : `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const num = (v) =>
        Number(v ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 3 });

    const toNullableNumber = (v) =>
        v === '' || v === null || v === undefined ? null : parseFloat(String(v).replace(',', '.'));

    // ===== Forms =====
    const createForm = useForm({
        name: '',
        description: '',
        unit: 'pcs',
        purchase_price: '',
        sale_price: '',
        quantity: 0,
        min_stock: 0,
    });

    const editForm = useForm({
        name: '',
        description: '',
        unit: 'pcs',
        purchase_price: '',
        sale_price: '',
    });

    const deleteForm = useForm();

    function openEdit(item) {
        setEditItemId(item.id);
        editForm.setData({
            name: item.name,
            description: item.description || '',
            unit: item.unit || 'pcs',
            purchase_price: item.purchase_price ?? '',
            sale_price: item.sale_price ?? '',
        });
        setIsEditOpen(true);
    }

    function handleCreate(e) {
        e.preventDefault();
        createForm.setData((d) => ({
            ...d,
            purchase_price: toNullableNumber(d.purchase_price),
            sale_price: toNullableNumber(d.sale_price),
        }));
        createForm.post('/inventories', {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    }

    function handleUpdate(e) {
        e.preventDefault();
        editForm.setData((d) => ({
            ...d,
            purchase_price: toNullableNumber(d.purchase_price),
            sale_price: toNullableNumber(d.sale_price),
        }));
        editForm.put(`/inventories/${editItemId}`, {
            preserveScroll: true,
            onSuccess: () => setIsEditOpen(false),
        });
    }

    function handleDelete(id) {
        if (confirm('¿Seguro que deseas eliminar este ítem?')) {
            deleteForm.delete(`/inventories/${id}`);
        }
    }

    function saveMinStock(inventoryId, value) {
        const minStock = Math.max(0, parseInt(value || 0, 10) || 0);
        Inertia.patch(
            route('inventories.min_stock', inventoryId),
            { min_stock: minStock, location_id: principalId || undefined },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => toast.success('Mínimo actualizado'),
                onError: () => toast.error('No se pudo actualizar el mínimo'),
            }
        );
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Inventarios</h2>}
        >
            <Head title="Inventarios" />

            <div className="py-4 sm:py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Actions + search (placeholder) */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 active:scale-[0.99] transition"
                        >
                            + Nuevo
                        </button>

                        <div className="flex w-full sm:w-80">
                            <input
                                type="search"
                                placeholder="Buscar producto…"
                                className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        // Implementa tu búsqueda server-side si la tienes
                                        toast('Busca por nombre (implementa la query en el servidor)');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* ===== Listado: Cards en móvil / Tabla en desktop ===== */}
                    {/* Cards (sm-) */}
                    <div className="space-y-3 sm:hidden">
                        {rows.length === 0 && (
                            <div className="rounded-lg border bg-white p-4 text-gray-500">Sin registros.</div>
                        )}

                        {rows.map((item) => (
                            <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Unidad: <span className="uppercase">{item.unit}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Disponible</p>
                                        <p className="font-semibold">{num(item.available_total)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">Precio compra</p>
                                        <p className="font-medium">{money(item.purchase_price)}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">Precio venta</p>
                                        <p className="font-medium">{money(item.sale_price)}</p>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="text-xs text-gray-500">Mín (Principal)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        defaultValue={item.principal_min_stock ?? 0}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                        onBlur={(e) => saveMinStock(item.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                    />
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => openEdit(item)}
                                        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-red-700 border-red-200 hover:bg-red-50"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabla (md+) */}
                    <div className="hidden sm:block bg-white shadow-sm sm:rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible (total)</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mín (Principal)</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio compra</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio venta</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={7}>
                                            Sin registros.
                                        </td>
                                    </tr>
                                )}

                                {rows.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{item.name}</td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap uppercase">{item.unit}</td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{num(item.available_total)}</td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="0"
                                                defaultValue={item.principal_min_stock ?? 0}
                                                className="w-24 rounded border px-2 py-1"
                                                onBlur={(e) => saveMinStock(item.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{money(item.purchase_price)}</td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{money(item.sale_price)}</td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="text-indigo-700 px-3 py-1.5 rounded border border-indigo-200 hover:bg-indigo-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-700 px-3 py-1.5 rounded border border-red-200 hover:bg-red-50"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {links.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
                            <div className="text-sm text-gray-500">
                                {rows.length} ítems en esta página
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-3 py-1.5 rounded-lg border text-sm
                      ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}
                      ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== Modal Create ===== */}
            <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 p-4 sm:p-6 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-2xl shadow-xl">
                        <div className="p-4 sm:p-6 md:p-8">
                            <Dialog.Title className="text-lg sm:text-xl font-bold mb-4">Nuevo Inventario</Dialog.Title>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="create-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input
                                            id="create-name"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                        />
                                        {createForm.errors.name && <p className="text-red-600 text-xs mt-1">{createForm.errors.name}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label htmlFor="create-description" className="block text-sm font-medium text-gray-700">Descripción</label>
                                        <textarea
                                            id="create-description"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.description}
                                            onChange={(e) => createForm.setData('description', e.target.value)}
                                        />
                                        {createForm.errors.description && <p className="text-red-600 text-xs mt-1">{createForm.errors.description}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="create-unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                                        <select
                                            id="create-unit"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.unit}
                                            onChange={(e) => createForm.setData('unit', e.target.value)}
                                        >
                                            <option value="pcs">Piezas (pcs)</option>
                                            <option value="gr">Gramos (gr)</option>
                                        </select>
                                        {createForm.errors.unit && <p className="text-red-600 text-xs mt-1">{createForm.errors.unit}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="create-quantity" className="block text-sm font-medium text-gray-700">Stock inicial</label>
                                        <input
                                            type="number" min="0" id="create-quantity"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.quantity}
                                            onChange={(e) => createForm.setData('quantity', e.target.value)}
                                        />
                                        {createForm.errors.quantity && <p className="text-red-600 text-xs mt-1">{createForm.errors.quantity}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="create-min" className="block text-sm font-medium text-gray-700">Mín (Principal)</label>
                                        <input
                                            type="number" min="0" id="create-min"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.min_stock}
                                            onChange={(e) => createForm.setData('min_stock', e.target.value)}
                                        />
                                        {createForm.errors.min_stock && <p className="text-red-600 text-xs mt-1">{createForm.errors.min_stock}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="create-purchase" className="block text-sm font-medium text-gray-700">Precio compra (opcional)</label>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="Opcional"
                                            id="create-purchase"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.purchase_price}
                                            onChange={(e) => createForm.setData('purchase_price', e.target.value)}
                                        />
                                        {createForm.errors.purchase_price && <p className="text-red-600 text-xs mt-1">{createForm.errors.purchase_price}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="create-sale" className="block text-sm font-medium text-gray-700">Precio venta (opcional)</label>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="Opcional"
                                            id="create-sale"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={createForm.data.sale_price}
                                            onChange={(e) => createForm.setData('sale_price', e.target.value)}
                                        />
                                        {createForm.errors.sale_price && <p className="text-red-600 text-xs mt-1">{createForm.errors.sale_price}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 rounded-lg border">
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                    >
                                        {createForm.processing ? 'Guardando…' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* ===== Modal Edit ===== */}
            <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 p-4 sm:p-6 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-2xl shadow-xl">
                        <div className="p-4 sm:p-6 md:p-8">
                            <Dialog.Title className="text-lg sm:text-xl font-bold mb-4">Editar Inventario</Dialog.Title>

                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input
                                            id="edit-name"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={editForm.data.name}
                                            onChange={(e) => editForm.setData('name', e.target.value)}
                                        />
                                        {editForm.errors.name && <p className="text-red-600 text-xs mt-1">{editForm.errors.name}</p>}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Descripción</label>
                                        <textarea
                                            id="edit-description"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={editForm.data.description}
                                            onChange={(e) => editForm.setData('description', e.target.value)}
                                        />
                                        {editForm.errors.description && <p className="text-red-600 text-xs mt-1">{editForm.errors.description}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="edit-unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                                        <select
                                            id="edit-unit"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={editForm.data.unit}
                                            onChange={(e) => editForm.setData('unit', e.target.value)}
                                        >
                                            <option value="pcs">Piezas (pcs)</option>
                                            <option value="gr">Gramos (gr)</option>
                                        </select>
                                        {editForm.errors.unit && <p className="text-red-600 text-xs mt-1">{editForm.errors.unit}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="edit-purchase" className="block text-sm font-medium text-gray-700">Precio compra (opcional)</label>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="Opcional"
                                            id="edit-purchase"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={editForm.data.purchase_price}
                                            onChange={(e) => editForm.setData('purchase_price', e.target.value)}
                                        />
                                        {editForm.errors.purchase_price && <p className="text-red-600 text-xs mt-1">{editForm.errors.purchase_price}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="edit-sale" className="block text-sm font-medium text-gray-700">Precio venta (opcional)</label>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="Opcional"
                                            id="edit-sale"
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                            value={editForm.data.sale_price}
                                            onChange={(e) => editForm.setData('sale_price', e.target.value)}
                                        />
                                        {editForm.errors.sale_price && <p className="text-red-600 text-xs mt-1">{editForm.errors.sale_price}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg border">
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editForm.processing}
                                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                    >
                                        {editForm.processing ? 'Actualizando…' : 'Actualizar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
