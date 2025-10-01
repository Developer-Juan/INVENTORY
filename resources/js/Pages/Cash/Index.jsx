import React, { useMemo, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function CashIndex() {
    const {
        auth,
        errors: sharedErrors = {},
        locations = [],
        moves = [],
        totalCash = 0,
        isAdmin = false,
    } = usePage().props;

    const [showTransfer, setShowTransfer] = useState(false);
    const [showPickup, setShowPickup] = useState(false);

    const locationById = useMemo(() => {
        const map = {};
        for (const l of locations) map[String(l.id)] = l;
        return map;
    }, [locations]);

    const tf = useForm({
        from_location_id: "",
        to_location_id: "",
        amount: "",
        note: "",
    });

    const pf = useForm({
        location_id: "",
        amount: "",
        note: "",
    });

    const fmt = (n) =>
        Number(n ?? 0).toLocaleString("es-CO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const canTransfer = useMemo(() => {
        const a = parseFloat(tf.data.amount);
        return (
            isAdmin &&
            tf.data.from_location_id &&
            tf.data.to_location_id &&
            tf.data.from_location_id !== tf.data.to_location_id &&
            a > 0 &&
            !tf.processing
        );
    }, [tf, isAdmin]);

    const canPickup = useMemo(() => {
        const a = parseFloat(pf.data.amount);
        return isAdmin && pf.data.location_id && a > 0 && !pf.processing;
    }, [pf, isAdmin]);

    function submitTransfer(e) {
        e.preventDefault();
        tf.post(route("cash.transfer"), {
            onSuccess: () => {
                setShowTransfer(false);
                tf.reset();
            },
            preserveScroll: true,
        });
    }

    function submitPickup(e) {
        e.preventDefault();
        pf.post(route("cash.pickup"), {
            onSuccess: () => {
                setShowPickup(false);
                pf.reset();
            },
            preserveScroll: true,
        });
    }

    const reasonLabel = (code) => {
        switch (code) {
            case "SALE":
                return "Efectivo venta";
            case "SALE_PAYMENT":
                return "Pago de venta (abono/saldo)";
            case "SALE_CANCEL":
                return "Reverso efectivo por anulación";
            case "CASH_TRANSFER":
                return "Transferencia";
            case "CASH_PICKUP":
                return "Recogida de efectivo";
            default:
                return code ?? "";
        }
    };

    const replaceIdsWithLocationNames = (text) =>
        (text || "").replace(/#(\d+)/g, (_m, id) => {
            const loc = locationById[String(id)];
            return loc ? loc.name : `#${id}`;
        });

    const prettyReason = (m) => {
        const base = reasonLabel(m.reason);
        const note = replaceIdsWithLocationNames(m.note || "");
        return note ? `${base} · ${note}` : base;
    };

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={sharedErrors}
            header={<h2 className="font-semibold text-xl">Caja por ubicación</h2>}
        >
            <Head title="Caja por ubicación" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
                {/* Resumen */}
                <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">Total efectivo en todas las ubicaciones</p>
                        <p className="text-2xl font-semibold">$ {fmt(totalCash)}</p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                                onClick={() => setShowTransfer(true)}
                            >
                                Transferir efectivo
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white"
                                onClick={() => setShowPickup(true)}
                            >
                                Recoger efectivo
                            </button>
                        </div>
                    )}
                </div>

                {/* Saldos por ubicación */}
                <div className="bg-white rounded-xl shadow overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Ubicación</th>
                                <th className="px-4 py-3 text-right">Efectivo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {locations.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-2">{l.name}</td>
                                    <td className="px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap">
                                        $ {fmt(l.cash_on_hand)}
                                    </td>
                                </tr>
                            ))}
                            {locations.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-gray-500" colSpan={2}>
                                        Sin ubicaciones.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Movimientos recientes */}
                <div className="bg-white rounded-xl shadow overflow-auto">
                    <div className="px-4 py-3 border-b font-semibold">Movimientos recientes</div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        {/* —— Aquí fijamos el ancho de la columna Monto —— */}
                        <colgroup>
                            <col /> {/* Fecha */}
                            <col /> {/* Ubicación */}
                            <col /> {/* Tipo */}
                            <col className="w-40 sm:w-44 md:w-52 lg:w-60" /> {/* Monto más ancho */}
                            <col /> {/* Motivo */}
                            <col /> {/* Usuario */}
                        </colgroup>

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Fecha</th>
                                <th className="px-4 py-3 text-left">Ubicación</th>
                                <th className="px-4 py-3 text-left">Tipo</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3 text-left">Motivo</th>
                                <th className="px-4 py-3 text-left">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {moves.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-4 py-2">
                                        {m.created_at ? new Date(m.created_at).toLocaleString("es-CO") : ""}
                                    </td>
                                    <td className="px-4 py-2">{m.location?.name ?? "—"}</td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs ${m.direction === "in"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {m.direction === "in" ? "Ingreso" : "Egreso"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                                        $ {fmt(m.amount)}
                                    </td>
                                    <td className="px-4 py-2">{prettyReason(m)}</td>
                                    <td className="px-4 py-2">{m.creator?.name ?? "—"}</td>
                                </tr>
                            ))}
                            {moves.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-gray-500" colSpan={6}>
                                        Sin movimientos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Transferir */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow max-w-lg w-full p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Transferir efectivo</h3>
                            <button onClick={() => setShowTransfer(false)} className="text-gray-500">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submitTransfer} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Desde</label>
                                <select
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    value={tf.data.from_location_id}
                                    onChange={(e) => tf.setData("from_location_id", e.target.value)}
                                >
                                    <option value="">— Selecciona —</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} — ${fmt(l.cash_on_hand)}
                                        </option>
                                    ))}
                                </select>
                                {tf.errors.from_location_id && (
                                    <p className="text-xs text-red-600 mt-1">{tf.errors.from_location_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Hacia</label>
                                <select
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    value={tf.data.to_location_id}
                                    onChange={(e) => tf.setData("to_location_id", e.target.value)}
                                >
                                    <option value="">— Selecciona —</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                                {tf.errors.to_location_id && (
                                    <p className="text-xs text-red-600 mt-1">{tf.errors.to_location_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Monto</label>
                                <input
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={tf.data.amount}
                                    onChange={(e) => tf.setData("amount", e.target.value)}
                                />
                                {tf.errors.amount && (
                                    <p className="text-xs text-red-600 mt-1">{tf.errors.amount}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Nota (opcional)</label>
                                <input
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    value={tf.data.note}
                                    onChange={(e) => tf.setData("note", e.target.value)}
                                    maxLength={191}
                                />
                                {tf.errors.note && (
                                    <p className="text-xs text-red-600 mt-1">{tf.errors.note}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg border"
                                    onClick={() => setShowTransfer(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canTransfer}
                                    className={`px-4 py-2 rounded-lg text-white ${canTransfer ? "bg-blue-600" : "bg-gray-400"
                                        }`}
                                >
                                    {tf.processing ? "Procesando…" : "Transferir"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Recoger */}
            {showPickup && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow max-w-lg w-full p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Recoger efectivo</h3>
                            <button onClick={() => setShowPickup(false)} className="text-gray-500">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submitPickup} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium">Ubicación</label>
                                <select
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    value={pf.data.location_id}
                                    onChange={(e) => pf.setData("location_id", e.target.value)}
                                >
                                    <option value="">— Selecciona —</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} — ${fmt(l.cash_on_hand)}
                                        </option>
                                    ))}
                                </select>
                                {pf.errors.location_id && (
                                    <p className="text-xs text-red-600 mt-1">{pf.errors.location_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Monto</label>
                                <input
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={pf.data.amount}
                                    onChange={(e) => pf.setData("amount", e.target.value)}
                                />
                                {pf.errors.amount && (
                                    <p className="text-xs text-red-600 mt-1">{pf.errors.amount}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium">Nota (opcional)</label>
                                <input
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                    value={pf.data.note}
                                    onChange={(e) => pf.setData("note", e.target.value)}
                                    maxLength={191}
                                />
                                {pf.errors.note && (
                                    <p className="text-xs text-red-600 mt-1">{pf.errors.note}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg border"
                                    onClick={() => setShowPickup(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canPickup}
                                    className={`px-4 py-2 rounded-lg text-white ${canPickup ? "bg-amber-600" : "bg-gray-400"
                                        }`}
                                >
                                    {pf.processing ? "Procesando…" : "Recoger"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
