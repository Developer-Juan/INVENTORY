import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function InternalDocs({ auth, errors, plans = [] }) {
    const sections = useMemo(
        () => [
            {
                id: 'overview',
                title: 'Visión general',
                body: (
                    <>
                        <p>
                            Esta documentación interna resume los flujos principales de la aplicación:
                            ventas, inventario, puntos y soporte. Úsala como referencia rápida.
                        </p>
                        <ul className="mt-3 list-disc pl-5 space-y-1">
                            <li>Ventas: creación, pagos, anulaciones.</li>
                            <li>Inventario: stock, mínimos, transferencias.</li>
                            <li>Puntos: acumulación y redención.</li>
                            <li>Soporte: tickets y notificaciones.</li>
                            <li>Correos: avisos para admins y dealers.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'plans',
                title: 'Planes y suscripciones',
                body: (
                    <>
                        <p>
                            Los planes se administran desde el panel de superadmin y permiten controlar
                            duraciones, precios y estados de cada admin.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {(plans.length
                                ? plans
                                : [
                                      { id: 'demo', name: 'Demo (15 días)', duration_days: 15, price: 0 },
                                      { id: 'mensual', name: 'Mensual', duration_days: 30, price: 0 },
                                      { id: 'anual', name: 'Anual', duration_days: 365, price: 0 },
                                  ]
                            ).map((plan) => (
                                <div
                                    key={plan.id || plan.name}
                                    className="js-anime-card rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Plan
                                        </span>
                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {plan.duration_days} días
                                        </span>
                                    </div>
                                    <h4 className="mt-2 font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h4>
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                        {Number(plan.price || 0) > 0 ? `$${plan.price}` : 'Precio a medida'}
                                    </p>
                                    <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                                        <div className="h-full w-2/3 rounded-full bg-indigo-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ),
            },
            {
                id: 'errors',
                title: 'Vistas de error',
                body: (
                    <>
                        <p>
                            Estas vistas permiten revisar el diseño de errores y su comportamiento visual.
                            Se abren como previsualizaciones internas.
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {[
                                { id: '404', title: 'Error 404', desc: 'Página no encontrada.' },
                                { id: '419', title: 'Error 419', desc: 'Página expirada.' },
                                { id: '429', title: 'Error 429', desc: 'Demasiadas solicitudes.' },
                                { id: '500', title: 'Error 500', desc: 'Fallo interno del servidor.' },
                            ].map((item) => (
                                <div
                                    key={item.id}
                                    className="js-anime-card rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
                                        </div>
                                        <Link
                                            href={route(`docs.internal.previews.${item.id}`)}
                                            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            Ver
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ),
            },
            {
                id: 'sales',
                title: 'Ventas',
                body: (
                    <>
                        <p>
                            Las ventas se registran con items, método(s) de pago y estado. El sistema calcula
                            subtotal, descuentos, impuestos y balance.
                        </p>
                        <h4 className="mt-4 font-semibold">Estados</h4>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Pagado: saldo en cero.</li>
                            <li>Parcial: pagos parciales.</li>
                            <li>Debe: sin pagos.</li>
                            <li>Anulada: reversa stock y caja.</li>
                        </ul>
                        <p className="mt-3">
                            Cuando se crea una venta se notifica por correo a los admins (si esta habilitado).
                        </p>
                    </>
                ),
            },
            {
                id: 'inventory',
                title: 'Inventario',
                body: (
                    <>
                        <p>
                            El stock se gestiona por ubicación. Los mínimos generan alertas y notificaciones
                            cuando el disponible cae por debajo del umbral.
                        </p>
                        <h4 className="mt-4 font-semibold">Buenas prácticas</h4>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Usa mínimos en items críticos.</li>
                            <li>Revisa resumen de stock semanal.</li>
                            <li>Registra transferencias con nota.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'points',
                title: 'Puntos',
                body: (
                    <>
                        <p>
                            Los puntos se acumulan por ítems en cada venta y pueden redimirse como descuento,
                            según el valor por punto configurado.
                        </p>
                        <h4 className="mt-4 font-semibold">Reglas clave</h4>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>No se puede redimir más que el total de la venta.</li>
                            <li>El cliente debe estar asociado a la venta.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'support',
                title: 'Soporte',
                body: (
                    <>
                        <p>
                            Los tickets permiten centralizar solicitudes. Los dealers crean tickets y los
                            admins responden desde el panel.
                        </p>
                        <h4 className="mt-4 font-semibold">Flujo</h4>
                        <ol className="mt-2 list-decimal pl-5 space-y-1">
                            <li>Dealer abre ticket con asunto y descripción.</li>
                            <li>Admin responde y gestiona el estado.</li>
                            <li>Se cierra y queda historial.</li>
                        </ol>
                        <p className="mt-3">
                            Las respuestas generan correo para el otro lado (admin o dealer), si el usuario lo tiene habilitado.
                        </p>
                    </>
                ),
            },
            {
                id: 'reports',
                title: 'Reportes',
                body: (
                    <>
                        <p>
                            Desde Finanzas puedes generar reportes filtrados de ventas en Excel o PDF.
                            La vista de reportes muestra una previsualización antes de exportar.
                        </p>
                    </>
                ),
            },
            {
                id: 'notifications',
                title: 'Notificaciones por correo',
                body: (
                    <>
                        <p>
                            Cada usuario puede activar o desactivar el correo desde Perfil. Cuando está activo,
                            se envían avisos por nuevos tickets, respuestas y nuevas ventas.
                        </p>
                        <h4 className="mt-4 font-semibold">Qué eventos generan correo</h4>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Nuevo ticket creado por un dealer.</li>
                            <li>Respuesta del admin al ticket (correo al dealer).</li>
                            <li>Respuesta del dealer al ticket (correo a admins).</li>
                            <li>Nueva venta registrada (correo a admins).</li>
                        </ul>
                        <h4 className="mt-4 font-semibold">Buenas prácticas</h4>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Revisar el panel de notificaciones para historial completo.</li>
                            <li>Usar correos solo como alerta, no como fuente única.</li>
                            <li>Si no quieres correos, desactívalo en Perfil.</li>
                        </ul>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Nota: el envío depende de la configuración SMTP y del switch “Enviar notificaciones por correo”.
                        </p>
                        <Link
                            href={route('profile.edit')}
                            className="inline-flex items-center mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Ir a Perfil para configurar correos
                        </Link>
                    </>
                ),
            },
        ],
        [plans]
    );

    const [activeId, setActiveId] = useState(sections[0].id);
    const activeSection = useMemo(
        () => sections.find((s) => s.id === activeId) ?? sections[0],
        [activeId, sections]
    );

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={errors}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Documentación interna</h2>}
        >
            <Head title="Documentación interna" />

            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
                    <aside className="bg-white js-anime-card dark:bg-gray-800 rounded-xl shadow p-3 h-fit sticky top-6">
                        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 pb-2">
                            Navegación
                        </div>
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setActiveId(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                                        activeId === section.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <section className="bg-white js-anime-card dark:bg-gray-800 rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {activeSection.title}
                        </h3>
                        <div className="mt-3 text-gray-700 dark:text-gray-200 space-y-3">
                            {activeSection.body}
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

