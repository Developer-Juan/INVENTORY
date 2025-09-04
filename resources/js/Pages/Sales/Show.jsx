// resources/js/Pages/Sales/Show.jsx
import React from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Show({ sale: saleProp }) {
    // Si viene por props lo usamos; si no, lo tomamos del share
    const shared = usePage().props;
    const sale = saleProp ?? shared.sale;
    const { auth, errors, flash = {} } = shared;

    if (!sale) return null;

    const customerId4 =
        sale.customer_id != null ? String(sale.customer_id).padStart(4, '0') : null;

    const statusBadge =
        sale.status === 'pagado'
            ? 'px-2 py-0.5 rounded-full bg-green-100 text-green-800'
            : sale.status === 'parcial'
                ? 'px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800'
                : 'px-2 py-0.5 rounded-full bg-red-100 text-red-800';

    // —— Delivery
    const hasDelivery = !!sale.delivery_id;
    const deliveryPaid = !!sale.delivery_settled_at; // datetime o null
    const deliveryBadge = deliveryPaid
        ? 'px-2 py-0.5 rounded-full bg-green-100 text-green-800'
        : 'px-2 py-0.5 rounded-full bg-red-100 text-red-800';

    function markDeliveryPaid() {
        if (!sale.delivery_pay || sale.delivery_pay <= 0) {
            alert('No hay tarifa de delivery para marcar.');
            return;
        }
        if (!confirm('¿Marcar el pago al domi como pagado?')) return;

        Inertia.post(`/sales/${sale.id}/delivery/settle`, {}, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl">Venta #{sale.id}</h2>}
        >
            <Head title={`Venta #${sale.id}`} />

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                {/* Resumen */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6 space-y-1">
                    <h1 className="text-xl font-bold mb-2">Venta #{sale.id}</h1>

                    <p>
                        <span className="text-gray-600">Cliente ID:</span>{' '}
                        {customerId4 ?? '—'}
                    </p>

                    <p>
                        <span className="text-gray-600">Vendedor:</span>{' '}
                        {sale.user?.name ?? '—'}
                    </p>

                    <p>
                        <span className="text-gray-600">Fecha:</span>{' '}
                        {sale.created_at ? new Date(sale.created_at).toLocaleString('es-CO') : '—'}
                    </p>

                    <p className="mt-2">
                        <span className="text-gray-600">Estado:</span>{' '}
                        <span className={statusBadge}>{sale.status}</span>
                    </p>

                    <p>
                        <span className="text-gray-600">Total:</span>{' '}
                        ${Number(sale.total).toLocaleString('es-CO')}
                    </p>
                    <p>
                        <span className="text-gray-600">Pagado:</span>{' '}
                        ${Number(sale.paid).toLocaleString('es-CO')}
                    </p>
                    <p>
                        <span className="text-gray-600">Saldo:</span>{' '}
                        ${Number(sale.balance).toLocaleString('es-CO')}
                    </p>
                </div>

                {/* Delivery */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6 space-y-2">
                    <h2 className="font-semibold mb-2">Delivery</h2>

                    {!hasDelivery ? (
                        <p className="text-gray-500">Sin delivery asignado.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <p>
                                <span className="text-gray-600">Repartidor:</span>{' '}
                                {sale.delivery?.name ?? '—'}
                            </p>
                            <p>
                                <span className="text-gray-600">KM recorridos:</span>{' '}
                                {Number(sale.km ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                            </p>
                            <p>
                                <span className="text-gray-600">Tarifa delivery:</span>{' '}
                                ${Number(sale.delivery_pay ?? 0).toLocaleString('es-CO')}
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="text-gray-600">Estado pago domi:</span>{' '}
                                {deliveryPaid ? (
                                    <span className={deliveryBadge}>Pagado</span>
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
                                    <span className="text-gray-500">
                                        ({new Date(sale.delivery_settled_at).toLocaleString('es-CO')})
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* Ítems */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6">
                    <h2 className="font-semibold mb-2">Ítems</h2>
                    {Array.isArray(sale.items) && sale.items.length ? (
                        <ul className="list-disc ml-6 space-y-1">
                            {sale.items.map((it) => (
                                <li key={it.id}>
                                    {it.inventory?.name} — {it.quantity} × $
                                    {Number(it.unit_price).toLocaleString('es-CO')} = $
                                    {Number(it.total).toLocaleString('es-CO')}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Sin ítems.</p>
                    )}
                </div>

                {/* Pagos */}
                <div className="bg-white shadow-sm sm:rounded-lg p-6">
                    <h2 className="font-semibold mb-2">Pagos</h2>
                    {Array.isArray(sale.payments) && sale.payments.length ? (
                        <ul className="list-disc ml-6 space-y-1">
                            {sale.payments.map((p) => (
                                <li key={p.id}>
                                    {p.method?.name}: ${Number(p.amount).toLocaleString('es-CO')}
                                    {p.reference ? ` (ref: ${p.reference})` : ' (sin ref)'}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Sin pagos.</p>
                    )}
                </div>

                <div className="flex justify-end">
                    <Link href="/sales" className="text-indigo-600 hover:text-indigo-800">
                        Volver al listado
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
