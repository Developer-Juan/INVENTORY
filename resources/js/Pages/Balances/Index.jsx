import React, { useState, useEffect } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import toast from "react-hot-toast";
import { confirmToast } from '@/Components/ConfirmToast';

export default function BalancesIndex() {
    const {
        auth,
        dealerLocations = [],
        filters = {},
        summary = {},
        dealerBreakdown = [],
        salesList = [],
        flash = {},
    } = usePage().props;

    // === helpers de formato ===
    const fmtMoney = (n) =>
        Number(n ?? 0).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
        });

    const fmtNum = (n, maxDec = 2) =>
        Number(n ?? 0).toLocaleString("es-CO", {
            minimumFractionDigits: 0,
            maximumFractionDigits: maxDec,
        });

    const normalizeDate = (val) => {
        if (!val) return "";
        const str = String(val);
        if (str.includes("/")) {
            // soportar dd/mm/yyyy
            const [d, m, y] = str.split("/");
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        return str; // asumimos YYYY-MM-DD
    };

    // === estado filtros controlados ===
    const [dealerId, setDealerId] = useState(filters.dealer_id ?? "");
    const [fromDate, setFromDate] = useState(normalizeDate(filters.from_date ?? ""));
    const [toDate, setToDate] = useState(normalizeDate(filters.to_date ?? ""));

    // === flash -> toast ===
    useEffect(() => {
        if (flash.success) toast.success(flash.success);
        if (flash.error) toast.error(flash.error);
        if (flash.info) {
            toast((t) => (
                <div className="text-sm text-gray-800 dark:text-gray-100">
                    {flash.info}
                    <button
                        className="ml-2 text-indigo-600 dark:text-indigo-400 underline"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        OK
                    </button>
                </div>
            ));
        }
    }, [flash]);

    // === aplicar filtros ===
    function applyFilters(e) {
        e?.preventDefault?.();

        const query = {};
        if (dealerId) query.dealer_id = dealerId;
        if (fromDate) query.from_date = normalizeDate(fromDate);
        if (toDate) query.to_date = normalizeDate(toDate);

        router.get(route("balances.index"), query, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    // === limpiar filtros ===
    function clearFilters() {
        setDealerId("");
        setFromDate("");
        setToDate("");

        router.get(route("balances.index"), {}, { preserveScroll: true, preserveState: true });
    }

    // === Acción MASIVA: pagar TODOS los pendientes de un dealer/punto ===
    function pagarDealer(dealerLocationId, pendingValue) {
        const monto = Number(pendingValue ?? 0);

        if (!dealerLocationId || monto <= 0) {
            toast.error("No hay pagos pendientes para este dealer.");
            return;
        }
        confirmToast({
            message: `¿Liquidar ${fmtMoney(monto)} en domicilios pendientes para este dealer/punto?`,
            confirmText: 'Liquidar',
            onConfirm: () => {
                router.post(
                    route("balances.settle", dealerLocationId),
                    { from_date: fromDate || "", to_date: toDate || "" },
                    {
                        preserveScroll: true,
                        onSuccess: () => toast.success("Pagos liquidados correctamente."),
                        onError: () => toast.error("Error al liquidar pagos."),
                    }
                );
            },
        });
    }

    // === Acción INDIVIDUAL: pagar SOLO una venta específica ===
    function pagarVenta(saleId, amount) {
        const m = Number(amount ?? 0);

        if (!saleId || m <= 0) {
            toast.error("Esta venta no tiene pago pendiente de domicilio.");
            return;
        }
        confirmToast({
            message: `¿Marcar como pagado el domicilio de ${fmtMoney(m)} para la venta #${saleId}?`,
            confirmText: 'Marcar',
            onConfirm: () => {
                router.post(route("sales.delivery.settle", saleId), {}, {
                    preserveScroll: true,
                    onSuccess: () => toast.success(`Venta #${saleId}: domicilio marcado pagado.`),
                    onError: () => toast.error("No se pudo marcar como pagado."),
                });
            },
        });
    }

    // ---------- Derivados para la cabecera del modo detalle ----------
    // El backend ahora manda:
    // - sales_count_all / total_qty_all / total_sold_all  (TODAS las ventas)
    // - payout_pending (solo pendientes de pago)
    const salesCountAll = Number(summary.sales_count_all ?? summary.sales_count ?? 0);
    const totalQtyAll = Number(summary.total_qty_all ?? summary.total_qty ?? 0);
    const totalSoldAll = Number(summary.total_sold_all ?? summary.total_sold ?? 0);
    const payoutPending = Number(summary.payout_pending ?? 0);

    return (
        <AuthenticatedLayout
            auth={auth}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">
                    Balances por Dealer
                </h2>
            }
        >
            <Head title="Balances por Dealer" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                {/* ================== FILTROS ================== */}
                <form
                    onSubmit={applyFilters}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                    {/* Dealer */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dealer / Sucursal
                        </label>
                        <select
                            className="mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 w-full text-sm"
                            value={dealerId}
                            onChange={(e) => setDealerId(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {dealerLocations.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {(d.user?.name ?? "Usuario") + " — " + d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desde */}
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Desde
                        </label>
                        <input
                            type="date"
                            className="mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 w-full text-sm"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Hasta */}
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hasta
                        </label>
                        <input
                            type="date"
                            className="mt-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 w-full text-sm"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    {/* Acciones filtro */}
                    <div className="lg:col-span-1 flex items-end gap-2">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
                            onClick={clearFilters}
                        >
                            Limpiar
                        </button>
                    </div>
                </form>

                {/* ================== VISTA GLOBAL ================== */}
                {summary.mode === "all" && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                        Dealer
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                        Ventas (#)
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                        Vendido total
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                        A pagar domicilio (pendiente)
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                                        Acción
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {(!summary.dealers || summary.dealers.length === 0) && (
                                    <tr>
                                        <td
                                            className="px-4 py-6 text-gray-500 dark:text-gray-400 text-center"
                                            colSpan={5}
                                        >
                                            Sin ventas en el rango.
                                        </td>
                                    </tr>
                                )}

                                {summary.dealers?.map((d) => {
                                    const pendingVal = Number(d.payout_pending ?? 0);
                                    return (
                                        <tr key={d.dealer_location_id}>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                                {d.dealer_name}
                                            </td>

                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                {fmtNum(d.sales_count, 0)}
                                            </td>

                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                {fmtMoney(d.total_sold)}
                                            </td>

                                            <td className="px-4 py-2 font-semibold text-green-700 dark:text-green-400">
                                                {fmtMoney(pendingVal)}
                                            </td>

                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    disabled={pendingVal <= 0}
                                                    onClick={() => pagarDealer(d.dealer_location_id, pendingVal)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${pendingVal > 0
                                                        ? "bg-green-600 text-white hover:bg-green-700"
                                                        : "bg-gray-400 text-white cursor-not-allowed opacity-50"
                                                        }`}
                                                >
                                                    Pagar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ================== VISTA DETALLE ================== */}
                {summary.mode === "single" && (
                    <>
                        {/* Cabecera dealer + botón para TODO el dealer */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {summary.dealer_name}
                                </h3>

                                {/* Totales de TODAS las ventas */}
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Ventas: {fmtNum(salesCountAll, 0)} | Unidades: {fmtNum(totalQtyAll, 2)}
                                </p>

                                {/* Pendiente por pagar al domicilio */}
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Total a pagar domicilio (pendiente):{" "}
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        {fmtMoney(payoutPending)}
                                    </span>
                                </p>
                            </div>

                            <button
                                disabled={payoutPending <= 0}
                                onClick={() => pagarDealer(summary.dealer_id, payoutPending)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto ${payoutPending > 0
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-400 text-white cursor-not-allowed opacity-50"
                                    }`}
                            >
                                Pagar todo al dealer
                            </button>
                        </div>

                        {/* Tabla ventas individuales con botón por fila */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            #
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Fecha
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Total venta
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Domicilio $
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Estado domi
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                                            Acción
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {(!salesList || salesList.length === 0) && (
                                        <tr>
                                            <td
                                                className="px-4 py-6 text-gray-500 dark:text-gray-400 text-center"
                                                colSpan={6}
                                            >
                                                Sin ventas registradas.
                                            </td>
                                        </tr>
                                    )}

                                    {salesList?.map((s) => {
                                        const pendiente = !!s.delivery_pending;
                                        const settledAt = s.delivery_settled_at;
                                        const deliveryMonto = Number(s.delivery_pay ?? 0);

                                        return (
                                            <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700">
                                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{s.id}</td>

                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                    {s.created_at
                                                        ? new Date(s.created_at).toLocaleString("es-CO")
                                                        : "—"}
                                                </td>

                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                    {fmtMoney(s.total)}
                                                </td>

                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                    {fmtMoney(deliveryMonto)}
                                                </td>

                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                    {pendiente ? (
                                                        <span className="text-red-500 font-semibold">Pendiente</span>
                                                    ) : settledAt ? (
                                                        <span className="text-green-600 font-semibold">Pagado</span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>

                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        disabled={!pendiente}
                                                        onClick={() => pagarVenta(s.id, deliveryMonto)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${pendiente
                                                            ? "bg-green-600 text-white hover:bg-green-700"
                                                            : "bg-gray-400 text-white cursor-not-allowed opacity-50"
                                                            }`}
                                                    >
                                                        Pagar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Breakdown por producto pendiente */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Producto
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Unidad
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Cantidad vendida
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Total $
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {(!dealerBreakdown || dealerBreakdown.length === 0) && (
                                        <tr>
                                            <td
                                                className="px-4 py-6 text-gray-500 dark:text-gray-400 text-center"
                                                colSpan={4}
                                            >
                                                Sin items vendidos en el rango.
                                            </td>
                                        </tr>
                                    )}

                                    {dealerBreakdown?.map((it) => (
                                        <tr key={it.inventory_id}>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                                <div className="font-medium">{it.name}</div>
                                                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                                    #{it.inventory_id}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 uppercase text-gray-700 dark:text-gray-200">
                                                {it.unit || "—"}
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                {fmtNum(it.total_qty, 2)}
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                                                {fmtMoney(it.total_line_amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
