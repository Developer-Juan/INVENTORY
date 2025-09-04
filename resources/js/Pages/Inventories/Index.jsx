// resources/js/Pages/Inventories/Index.jsx
import React, { useEffect, useState } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { Dialog } from '@headlessui/react';
import { Inertia } from '@inertiajs/inertia';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index() {
    // props del servidor
    const { items: payload, principalId, auth, errors, flash = {} } = usePage().props;

    // paginator normalizado
    const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
    const links = Array.isArray(payload) ? [] : (payload?.links ?? []);

    // toasts flash
    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
    }, [flash]);

    // UI estado modales
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editItemId, setEditItemId] = useState(null);

    // helpers
    const money = (v) =>
        v == null
            ? '—'
            : `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const num = (v) => Number(v ?? 0).toLocaleString('es-CO');

    const toNullableNumber = (v) =>
        v === '' || v === null || v === undefined ? null : parseFloat(v);

    // ---------- Forms ----------
    // Crear (incluye stock inicial en Principal y min_stock)
    const createForm = useForm({
        name: '',
        description: '',
        unit: 'pcs',
        purchase_price: '', // opcional
        sale_price: '',     // opcional
        quantity: 0,        // stock inicial en Principal
        min_stock: 0,       // min en Principal
    });

    // Editar (NO tocamos stock aquí; sólo datos del producto)
    const editForm = useForm({
        name: '',
        description: '',
        unit: 'pcs',
        purchase_price: '',
        sale_price: '',
    });

    const deleteForm = useForm();

    // abrir modal edición
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

    // crear
    function handleCreate(e) {
        e.preventDefault();

        // normaliza '' => null en precios
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

    // actualizar básico (sin tocar stock)
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

    // eliminar
    function handleDelete(id) {
        if (confirm('¿Seguro que deseas eliminar este ítem?')) {
            deleteForm.delete(`/inventories/${id}`);
        }
    }

    // guardar min_stock (principal) al salir del input o Enter
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

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
                    >
                        + Nuevo
                    </button>

                    <div className="bg-white shadow-sm sm:rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible (total)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mín (Principal)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio compra</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio venta</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-200">
                                {rows.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap uppercase">{item.unit}</td>

                                        {/* Disponible total (suma on_hand - reserved en todas las ubicaciones) */}
                                        <td className="px-6 py-4 whitespace-nowrap">{num(item.available_total)}</td>

                                        {/* Min principal editable */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="0"
                                                defaultValue={item.principal_min_stock ?? 0}
                                                className="w-24 border rounded px-2 py-1"
                                                onBlur={(e) => saveMinStock(item.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">{money(item.purchase_price)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{money(item.sale_price)}</td>

                                        <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {rows.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={7}>
                                            Sin registros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {links.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1 rounded border
                    ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}
                    ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Create */}
            <Dialog
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                className="fixed inset-0 z-10 flex items-center justify-center"
            >
                <Dialog.Overlay className="fixed inset-0 bg-black/30" />
                <div className="bg-white p-6 rounded shadow-lg z-20 w-96">
                    <Dialog.Title className="text-lg font-bold mb-4">Nuevo Inventario</Dialog.Title>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label htmlFor="create-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                id="create-name"
                                className="mt-1 w-full border px-2 py-1"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                            />
                            {createForm.errors.name && <p className="text-red-600 text-xs mt-1">{createForm.errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="create-description" className="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea
                                id="create-description"
                                className="mt-1 w-full border px-2 py-1"
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                            />
                            {createForm.errors.description && <p className="text-red-600 text-xs mt-1">{createForm.errors.description}</p>}
                        </div>

                        <div>
                            <label htmlFor="create-unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                            <select
                                id="create-unit"
                                className="mt-1 w-full border px-2 py-1"
                                value={createForm.data.unit}
                                onChange={(e) => createForm.setData('unit', e.target.value)}
                            >
                                <option value="pcs">Piezas (pcs)</option>
                                <option value="gr">Gramos (gr)</option>
                            </select>
                            {createForm.errors.unit && <p className="text-red-600 text-xs mt-1">{createForm.errors.unit}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="create-purchase" className="block text-sm font-medium text-gray-700">Precio compra (opcional)</label>
                                <input
                                    type="number" step="0.01" min="0" placeholder="Opcional"
                                    id="create-purchase"
                                    className="mt-1 w-full border px-2 py-1"
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
                                    className="mt-1 w-full border px-2 py-1"
                                    value={createForm.data.sale_price}
                                    onChange={(e) => createForm.setData('sale_price', e.target.value)}
                                />
                                {createForm.errors.sale_price && <p className="text-red-600 text-xs mt-1">{createForm.errors.sale_price}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="create-quantity" className="block text-sm font-medium text-gray-700">Stock inicial</label>
                                <input
                                    type="number" min="0"
                                    id="create-quantity"
                                    className="mt-1 w-full border px-2 py-1"
                                    value={createForm.data.quantity}
                                    onChange={(e) => createForm.setData('quantity', e.target.value)}
                                />
                                {createForm.errors.quantity && <p className="text-red-600 text-xs mt-1">{createForm.errors.quantity}</p>}
                            </div>

                            <div>
                                <label htmlFor="create-min" className="block text-sm font-medium text-gray-700">Mín (Principal)</label>
                                <input
                                    type="number" min="0"
                                    id="create-min"
                                    className="mt-1 w-full border px-2 py-1"
                                    value={createForm.data.min_stock}
                                    onChange={(e) => createForm.setData('min_stock', e.target.value)}
                                />
                                {createForm.errors.min_stock && <p className="text-red-600 text-xs mt-1">{createForm.errors.min_stock}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1">Cancelar</button>
                            <button type="submit" disabled={createForm.processing} className="px-3 py-1 bg-green-600 text-white rounded">
                                {createForm.processing ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            </Dialog>

            {/* Modal Edit */}
            <Dialog
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                className="fixed inset-0 z-10 flex items-center justify-center"
            >
                <Dialog.Overlay className="fixed inset-0 bg-black/30" />
                <div className="bg-white p-6 rounded shadow-lg z-20 w-96">
                    <Dialog.Title className="text-lg font-bold mb-4">Editar Inventario</Dialog.Title>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                id="edit-name"
                                className="mt-1 w-full border px-2 py-1"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            {editForm.errors.name && <p className="text-red-600 text-xs mt-1">{editForm.errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea
                                id="edit-description"
                                className="mt-1 w-full border px-2 py-1"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                            />
                            {editForm.errors.description && <p className="text-red-600 text-xs mt-1">{editForm.errors.description}</p>}
                        </div>

                        <div>
                            <label htmlFor="edit-unit" className="block text-sm font-medium text-gray-700">Unidad</label>
                            <select
                                id="edit-unit"
                                className="mt-1 w-full border px-2 py-1"
                                value={editForm.data.unit}
                                onChange={(e) => editForm.setData('unit', e.target.value)}
                            >
                                <option value="pcs">Piezas (pcs)</option>
                                <option value="gr">Gramos (gr)</option>
                            </select>
                            {editForm.errors.unit && <p className="text-red-600 text-xs mt-1">{editForm.errors.unit}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="edit-purchase" className="block text-sm font-medium text-gray-700">Precio compra (opcional)</label>
                                <input
                                    type="number" step="0.01" min="0" placeholder="Opcional"
                                    id="edit-purchase"
                                    className="mt-1 w-full border px-2 py-1"
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
                                    className="mt-1 w-full border px-2 py-1"
                                    value={editForm.data.sale_price}
                                    onChange={(e) => editForm.setData('sale_price', e.target.value)}
                                />
                                {editForm.errors.sale_price && <p className="text-red-600 text-xs mt-1">{editForm.errors.sale_price}</p>}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsEditOpen(false)} className="px-3 py-1">Cancelar</button>
                            <button type="submit" disabled={editForm.processing} className="px-3 py-1 bg-green-600 text-white rounded">
                                {editForm.processing ? 'Actualizando…' : 'Actualizar'}
                            </button>
                        </div>
                    </form>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
