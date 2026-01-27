// resources/js/Pages/Sales/Show.jsx
import React, { useState, useEffect } from 'react';
import { Head, usePage, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import toast from 'react-hot-toast';
import { confirmToast } from '@/Components/ConfirmToast';

export default function Show({ sale: saleProp }) {
    // Traemos props compartidos por Inertia
    const shared = usePage().props;
    const initialSale = saleProp ?? shared.sale;
    const { auth, errors, flash = {} } = shared;

    // Estado local para poder actualizar la vista sin recargar
    const [localSale, setLocalSale] = useState(initialSale);

    // Mostrar flashes del backend (por si llegaste desde redirect normal)
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.info) toast(flash.info);
    }, [flash]);

    if (!localSale) return null;

    const sale = localSale;

    const fmtMoney = (n) =>
        Number(n ?? 0).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });

    const customerPhone = sale.customer_user?.phone ?? null;

    const statusBadge =
        sale.status === 'pagado'
            ? 'px-2 py-0.5 rounded-full bg-green-100 text-green-800'
            : sale.status === 'parcial'
                ? 'px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800'
                : sale.status === 'anulada'
                    ? 'px-2 py-0.5 rounded-full bg-gray-200 text-gray-700'
                    : sale.status === 'gift'
                        ? 'px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800'
                        : 'px-2 py-0.5 rounded-full bg-red-100 text-red-800';

    // Delivery
    const hasDelivery = !!sale.delivery_id;
    const deliveryPaid = !!sale.delivery_settled_at; // bool
    const deliveryBadge = deliveryPaid
        ? 'px-2 py-0.5 rounded-full bg-green-100 text-green-800'
        : 'px-2 py-0.5 rounded-full bg-red-100 text-red-800';

    async function markDeliveryPaid() {
        if (!sale.delivery_pay || sale.delivery_pay <= 0) {
            toast.error('No hay tarifa de delivery para marcar.');
            return;
        }
        confirmToast({
            message: '¿Marcar el pago al domi como pagado?',
            confirmText: 'Marcar',
            onConfirm: () => {
                router.post(
                    `/sales/${sale.id}/delivery/settle`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            // Optimistic UI: marcamos como pagado inmediatamente
                            const nowIso = new Date().toISOString();

                            setLocalSale((prev) => ({
                                ...prev,
                                delivery_settled_at: nowIso,
                            }));

                            console.warn('Delivery marcado como pagado.');
                        },
                        onError: (err) => {
                            console.error(err);
                            toast.error('No se pudo marcar el pago.');
                        },
                    }
                );
            },
        });
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">
                    Venta #{sale.id}
                </h2>
            }
        >
            <Head title={`Venta #${sale.id}`} />

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* ================= RESUMEN ================= */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6 space-y-1">
                    <h1 className="text-xl font-bold mb-2">
                        Venta #{sale.id}
                    </h1>

                    <p>
                        <span className="text-gray-600">Cliente ID:</span>{' '}
                        {customerPhone ?? '—'}
                    </p>
                    {sale.status === 'gift' && sale.customer_user && (
                        <p>
                            <span className="text-gray-600">Regalo para:</span>{' '}
                            {sale.customer_user?.name ?? '—'}
                        </p>
                    )}

                    <p>
                        <span className="text-gray-600">Vendedor:</span>{' '}
                        {sale.user?.name ?? '—'}
                    </p>

                    <p>
                        <span className="text-gray-600">Fecha:</span>{' '}
                        {sale.created_at
                            ? new Date(sale.created_at).toLocaleString('es-CO')
                            : '—'}
                    </p>

                    <p className="mt-2">
                        <span className="text-gray-600">Estado:</span>{' '}
                        <span className={statusBadge}>{sale.status}</span>
                    </p>

                    <p>
                        <span className="text-gray-600">Total:</span>{' '}
                        ${fmtMoney(sale.total)}
                    </p>
                    <p>
                        <span className="text-gray-600">Pagado:</span>{' '}
                        ${fmtMoney(sale.paid)}
                    </p>
                    <p>
                        <span className="text-gray-600">Saldo:</span>{' '}
                        ${fmtMoney(sale.balance)}
                    </p>
                    {sale.status === 'parcial' &&
                        (sale.debtor_name || sale.debtor_phone) && (
                            <p>
                                <span className="text-gray-600">
                                    Deudor:
                                </span>{' '}
                                {sale.debtor_name ?? '—'}
                                {sale.debtor_phone
                                    ? ` · ${sale.debtor_phone}`
                                    : ''}
                            </p>
                        )}
                </div>

                {/* ================= DELIVERY ================= */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6 space-y-2">
                    <h2 className="font-semibold mb-2">Delivery</h2>

                    {!hasDelivery ? (
                        <p className="text-gray-500">
                            Sin delivery asignado.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <p>
                                <span className="text-gray-600">
                                    Repartidor:
                                </span>{' '}
                                {sale.delivery?.name ?? '—'}
                            </p>
                            <p>
                                <span className="text-gray-600">
                                    KM recorridos:
                                </span>{' '}
                                {Number(sale.km ?? 0).toLocaleString('es-CO', {
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                            <p>
                                <span className="text-gray-600">
                                    Tarifa delivery:
                                </span>{' '}
                                ${fmtMoney(sale.delivery_pay ?? 0)}
                            </p>

                            <p className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                <span className="text-gray-600">
                                    Estado pago domi:
                                </span>{' '}
                                {deliveryPaid ? (
                                    <span className={deliveryBadge}>
                                        Pagado
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={markDeliveryPaid}
                                        className={`${deliveryBadge} cursor-pointer`}
                                        title="Marcar como pagado"
                                    >
                                        Pendiente
                                    </button>
                                )}

                                {deliveryPaid && sale.delivery_settled_at && (
                                    <span className="text-gray-500 text-xs sm:text-sm">
                                        (
                                        {new Date(
                                            sale.delivery_settled_at
                                        ).toLocaleString('es-CO')}
                                        )
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* ================= ÍTEMS ================= */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6">
                    <h2 className="font-semibold mb-2">Ítems</h2>

                    {Array.isArray(sale.items) && sale.items.length ? (
                        <ul className="list-disc ml-6 space-y-1">
                            {sale.items.map((it) => {
                                const qty = Number(it.quantity ?? 0);
                                const total = Number(it.total ?? 0);
                                const unitType = it.inventory?.unit ?? '';

                                return (
                                    <li key={it.id}>
                                        {it.inventory?.name ??
                                            `#${it.inventory_id}`}{' '}
                                        —{' '}
                                        {qty.toLocaleString('es-CO', {
                                            maximumFractionDigits: 3,
                                        })}
                                        {unitType ? ` ${unitType}` : ''} x{' '}
                                        {total.toLocaleString('es-CO', {
                                            maximumFractionDigits: 2,
                                        })}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Sin ítems.</p>
                    )}
                </div>

                {/* ================= PAGOS ================= */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6">
                    <h2 className="font-semibold mb-2">Pagos</h2>

                    {Array.isArray(sale.payments) && sale.payments.length ? (
                        <ul className="list-disc ml-6 space-y-1">
                            {sale.payments.map((p) => (
                                <li key={p.id}>
                                    {p.method?.name}: ${fmtMoney(p.amount)}
                                    {p.reference
                                        ? ` (ref: ${p.reference})`
                                        : ' (sin ref)'}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Sin pagos.</p>
                    )}
                </div>

                {/* ================= VOLVER ================= */}
                <div className="flex justify-end">
                    <Link
                        href={route('sales.index')}
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                    >
                        <span aria-hidden="true">←</span>
                        <span>Volver al listado</span>
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
