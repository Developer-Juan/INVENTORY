import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, useForm, usePage, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import toast from "react-hot-toast";

export default function Create() {
    const {
        auth,
        errors: sharedErrors = {},
        isAdmin = false,
        principalId,
        locations = [],
        dealerLocations = [], // viene del backend
        history = {},
        flash = {},
        filters = {}, // dealer_id, from_date, to_date
    } = usePage().props;

    const histRows = Array.isArray(history) ? history : history?.data ?? [];
    const histLinks = Array.isArray(history) ? [] : history?.links ?? [];

    // Dealers (para formulario creación cuando NO eres admin)
    const dealers = locations.filter((l) =>
        ["dealer", "secondary", "dealer_secondary"].includes(String(l.type))
    );

    // Todas ubicaciones (origen/destino modo admin)
    const allLocations = locations;

    // ----------------- helpers fecha -----------------
    function normalizeDateForState(val) {
        // lo que guardamos en el estado que va al <input type="date">
        if (!val) return "";
        if (val.includes("/")) {
            // viene como "16/10/2025"
            const [d, m, y] = val.split("/");
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; // "2025-10-16"
        }
        // ya es "2025-10-16"
        return val;
    }

    function normalizeDateForQuery(val) {
        // lo que mandamos al backend en el querystring
        if (!val) return "";
        if (val.includes("/")) {
            const [d, m, y] = val.split("/");
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        return val;
    }

    // ----------------- estado filtros -----------------
    const [dealerFilter, setDealerFilter] = useState(filters.dealer_id ?? "");
    const [fromDate, setFromDate] = useState(
        normalizeDateForState(filters.from_date ?? "")
    );
    const [toDate, setToDate] = useState(
        normalizeDateForState(filters.to_date ?? "")
    );

    function applyFilters(e) {
        e?.preventDefault?.();

        const query = {};
        if (dealerFilter) query.dealer_id = dealerFilter;
        if (fromDate) query.from_date = normalizeDateForQuery(fromDate);
        if (toDate) query.to_date = normalizeDateForQuery(toDate);

        router.get(route("transfers.create"), query, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function clearFilters() {
        setDealerFilter("");
        setFromDate("");
        setToDate("");

        router.get(
            route("transfers.create"),
            {},
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    }

    // ----------------- form de transferencia -----------------
    const form = useForm({
        from_location_id: isAdmin ? principalId || "" : undefined,
        to_location_id: isAdmin ? "" : undefined,
        dealer_location_id: isAdmin ? undefined : "",
        dealer_user_id: "",
        items: [],
        note: "",
    });

    const STEP = 0.5;
    const isGram = (u) => String(u || "").toLowerCase() === "gr";
    const norm = (raw) => {
        if (raw === "" || raw == null) return "";
        const n = parseFloat(String(raw).replace(",", "."));
        return Number.isFinite(n) ? n : "";
    };
    const snap05 = (n) => Math.round(n / STEP) * STEP;

    const fmtTotal = (n) => {
        const v = Number(n ?? 0);
        return Number.isInteger(v)
            ? v.toLocaleString("es-CO")
            : v.toLocaleString("es-CO", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 3,
            });
    };

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [row, setRow] = useState({
        inventory_id: "",
        name: "",
        unit: "",
        quantity: 1,
        stock_origin: undefined,
    });

    const [preview, setPreview] = useState({
        open: false,
        loading: false,
        header: null,
        items: [],
        error: null,
    });

    async function openPreview(t) {
        try {
            setPreview((p) => ({
                ...p,
                open: true,
                loading: true,
                error: null,
                items: [],
                header: null,
            }));

            const url = route("transfers.items", t.id);
            const res = await fetch(url, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/json",
                },
                credentials: "same-origin",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            setPreview({
                open: true,
                loading: false,
                header: data,
                items: data.items || [],
                error: null,
            });
        } catch {
            setPreview((p) => ({
                ...p,
                loading: false,
                error: "No se pudieron cargar los ítems.",
            }));
        }
    }

    function closePreview() {
        setPreview({
            open: false,
            loading: false,
            header: null,
            items: [],
            error: null,
        });
    }

    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape") closePreview();
        }
        if (preview.open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [preview.open]);

    // ----------------- autocomplete inventario -----------------
    useEffect(() => {
        let abort = false;
        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const t = setTimeout(async () => {
            try {
                const base = route("inventories.search");

                const originId = isAdmin
                    ? form.data.from_location_id || ""
                    : principalId || "";

                const params = new URLSearchParams({
                    term: query.trim(),
                    location_id: originId,
                });

                const res = await fetch(`${base}?${params.toString()}`, {
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        Accept: "application/json",
                    },
                    credentials: "same-origin",
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                if (!abort) setSuggestions(Array.isArray(data) ? data : []);
            } catch {
                if (!abort) setSuggestions([]);
            }
        }, 250);

        return () => {
            abort = true;
            clearTimeout(t);
        };
    }, [query, isAdmin, form.data.from_location_id, principalId]);

    function onPickSuggestion(it) {
        setRow({
            inventory_id: it.id,
            name: it.name,
            unit: it.unit || "",
            quantity: isGram(it.unit) ? STEP : 1,
            stock_origin:
                typeof it.stock_origin === "number"
                    ? it.stock_origin
                    : typeof it.stock === "number"
                        ? it.stock
                        : 0,
        });
        setQuery(it.name);
        setSuggestions([]);
    }

    function addLine(e) {
        e?.preventDefault?.();
        const id = Number(row.inventory_id);
        let qty = norm(row.quantity);
        if (!id || qty === "" || qty <= 0) return;

        if (isGram(row.unit)) {
            qty = snap05(qty);
            if (qty > 0 && qty < STEP) qty = STEP;
        } else {
            qty = Math.max(1, Math.floor(qty));
        }

        const idx = form.data.items.findIndex(
            (l) => Number(l.inventory_id) === id
        );

        if (idx >= 0) {
            const copy = [...form.data.items];
            copy[idx] = {
                ...copy[idx],
                quantity: Number(copy[idx].quantity) + qty,
            };
            form.setData("items", copy);
        } else {
            form.setData("items", [
                ...form.data.items,
                {
                    inventory_id: id,
                    quantity: qty,
                    _name: row.name,
                    _unit: row.unit,
                    _stock_origin:
                        typeof row.stock_origin === "number"
                            ? row.stock_origin
                            : 0,
                },
            ]);
        }

        setRow({
            inventory_id: "",
            name: "",
            unit: "",
            quantity: 1,
            stock_origin: undefined,
        });
        setQuery("");
        setSuggestions([]);
    }

    function removeLine(index) {
        const copy = [...form.data.items];
        copy.splice(index, 1);
        form.setData("items", copy);
    }

    function changeQty(index, value) {
        const unit = form.data.items[index]._unit;
        let v = norm(value);
        if (v === "") v = 0;

        if (isGram(unit)) {
            v = snap05(Math.max(0, v));
            if (v > 0 && v < STEP) v = STEP;
        } else {
            v = Math.max(1, Math.floor(v));
        }

        const copy = [...form.data.items];
        copy[index] = { ...copy[index], quantity: v };
        form.setData("items", copy);
    }

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    function submit(e) {
        e.preventDefault();

        const payload = isAdmin
            ? {
                from_location_id: form.data.from_location_id,
                to_location_id: form.data.to_location_id,
                items: form.data.items,
                note: form.data.note,
            }
            : {
                dealer_location_id: form.data.dealer_location_id,
                items: form.data.items,
                note: form.data.note,
            };

        form.post(route("transfers.store"), {
            preserveScroll: true,
            data: payload,
            onSuccess: () => {
                toast.success("Transferencia registrada exitosamente");
            },
            onError: () => {
                toast.error("No se pudo registrar la transferencia");
            },
        });
    }

    const canSubmit = useMemo(() => {
        const hasItems = form.data.items.length > 0 && !form.processing;
        if (isAdmin) {
            return (
                hasItems &&
                form.data.from_location_id &&
                form.data.to_location_id &&
                form.data.from_location_id !==
                form.data.to_location_id
            );
        }
        return hasItems && form.data.dealer_location_id;
    }, [isAdmin, form.processing, form.data]);

    const fmtQty = (n, unit) =>
        Number(n ?? 0).toLocaleString("es-CO", {
            minimumFractionDigits: isGram(unit) ? 0 : 0,
            maximumFractionDigits: isGram(unit) ? 3 : 0,
        });

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={sharedErrors}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">
                    Transferencias de inventario
                </h2>
            }
        >
            <Head title="Transferir stock" />

            {/* ================== FORM CREAR TRANSFER ================== */}
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
                <form onSubmit={submit} className="space-y-6">
                    {/* Selección origen/destino + nota */}
                    <div className="bg-white rounded-xl shadow p-4 grid gap-4 sm:grid-cols-3">
                        {isAdmin ? (
                            <>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Desde (origen)
                                    </label>
                                    <select
                                        className="mt-1 border rounded-lg px-3 py-2 w-full"
                                        value={
                                            form.data
                                                .from_location_id ?? ""
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                "from_location_id",
                                                e.target.value
                                                    ? Number(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                    : ""
                                            )
                                        }
                                    >
                                        <option value="">
                                            — Selecciona —
                                        </option>
                                        {allLocations.map((l) => (
                                            <option
                                                key={l.id}
                                                value={l.id}
                                            >
                                                {String(
                                                    l.type
                                                ).toUpperCase()}{" "}
                                                · {l.name}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors
                                        .from_location_id && (
                                            <p className="text-red-600 text-xs mt-1">
                                                {
                                                    form.errors
                                                        .from_location_id
                                                }
                                            </p>
                                        )}
                                </div>

                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Hacia (destino)
                                    </label>
                                    <select
                                        className="mt-1 border rounded-lg px-3 py-2 w-full"
                                        value={
                                            form.data
                                                .to_location_id ?? ""
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                "to_location_id",
                                                e.target.value
                                                    ? Number(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                    : ""
                                            )
                                        }
                                    >
                                        <option value="">
                                            — Selecciona —
                                        </option>
                                        {allLocations.map((l) => (
                                            <option
                                                key={l.id}
                                                value={l.id}
                                            >
                                                {String(
                                                    l.type
                                                ).toUpperCase()}{" "}
                                                · {l.name}
                                            </option>
                                        ))}
                                    </select>
                                    {form.errors
                                        .to_location_id && (
                                            <p className="text-red-600 text-xs mt-1">
                                                {
                                                    form.errors
                                                        .to_location_id
                                                }
                                            </p>
                                        )}
                                    {form.data
                                        .from_location_id &&
                                        form.data
                                            .to_location_id &&
                                        form.data
                                            .from_location_id ===
                                        form.data
                                            .to_location_id && (
                                            <p className="text-red-600 text-xs mt-1">
                                                El origen y el
                                                destino no
                                                pueden ser
                                                iguales
                                            </p>
                                        )}
                                </div>
                            </>
                        ) : (
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Dealer destino
                                </label>
                                <select
                                    className="mt-1 border rounded-lg px-3 py-2 w-full"
                                    value={
                                        form.data
                                            .dealer_location_id
                                    }
                                    onChange={(e) => {
                                        const locId =
                                            e.target.value
                                                ? Number(
                                                    e.target
                                                        .value
                                                )
                                                : "";
                                        form.setData(
                                            "dealer_location_id",
                                            locId
                                        );
                                        const d = dealers.find(
                                            (x) =>
                                                Number(
                                                    x.id
                                                ) ===
                                                Number(
                                                    locId
                                                )
                                        );
                                        form.setData(
                                            "dealer_user_id",
                                            d?.user_id ?? ""
                                        );
                                    }}
                                >
                                    <option value="">
                                        — Selecciona —
                                    </option>
                                    {dealers.map((d) => (
                                        <option
                                            key={d.id}
                                            value={d.id}
                                        >
                                            {d.user?.name ??
                                                "Usuario"}{" "}
                                            — {d.name}
                                        </option>
                                    ))}
                                </select>
                                {form.errors
                                    .dealer_location_id && (
                                        <p className="text-red-600 text-xs mt-1">
                                            {
                                                form.errors
                                                    .dealer_location_id
                                            }
                                        </p>
                                    )}
                            </div>
                        )}

                        <div
                            className={
                                isAdmin
                                    ? "sm:col-span-1"
                                    : "sm:col-span-2"
                            }
                        >
                            <label className="block text-sm font-medium text-gray-700">
                                Nota (opcional)
                            </label>
                            <input
                                className="mt-1 border rounded-lg px-3 py-2 w-full"
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData(
                                        "note",
                                        e.target.value
                                    )
                                }
                                placeholder="Motivo, referencia, etc."
                            />
                            {form.errors.note && (
                                <p className="text-red-600 text-xs mt-1">
                                    {form.errors.note}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Línea rápida + autocomplete */}
                    <div className="bg-white rounded-xl shadow p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2 relative">
                                <label className="block text-sm font-medium text-gray-700">
                                    Buscar producto
                                </label>
                                <input
                                    className="mt-1 border rounded-lg px-3 py-2 w-full"
                                    placeholder="Escribe al menos 2 letras…"
                                    value={query}
                                    onChange={(e) =>
                                        setQuery(
                                            e.target.value
                                        )
                                    }
                                />

                                {suggestions.length >
                                    0 && (
                                        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow">
                                            {suggestions.map(
                                                (s) => (
                                                    <button
                                                        key={
                                                            s.id
                                                        }
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                                        onClick={() =>
                                                            onPickSuggestion(
                                                                s
                                                            )
                                                        }
                                                    >
                                                        <div className="font-medium">
                                                            {
                                                                s.name
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ID #
                                                            {
                                                                s.id
                                                            }{" "}
                                                            ·{" "}
                                                            {String(
                                                                s.unit ||
                                                                ""
                                                            ).toUpperCase()}{" "}
                                                            ·
                                                            stock
                                                            origen:{" "}
                                                            {Number(
                                                                typeof s.stock_origin ===
                                                                    "number"
                                                                    ? s.stock_origin
                                                                    : s.stock ??
                                                                    0
                                                            ).toLocaleString(
                                                                "es-CO"
                                                            )}
                                                        </div>
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                            </div>

                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Cantidad
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="border rounded-lg px-3 py-2 w-28"
                                        placeholder={
                                            isGram(
                                                row.unit
                                            )
                                                ? "0.5"
                                                : "1"
                                        }
                                        value={
                                            row.quantity
                                        }
                                        onChange={(e) =>
                                            setRow(
                                                (r) => ({
                                                    ...r,
                                                    quantity:
                                                        e
                                                            .target
                                                            .value,
                                                })
                                            )
                                        }
                                        onBlur={() =>
                                            setRow(
                                                (r) => {
                                                    let q =
                                                        norm(
                                                            r.quantity
                                                        );
                                                    if (
                                                        q ===
                                                        ""
                                                    )
                                                        q = 0;
                                                    if (
                                                        isGram(
                                                            r.unit
                                                        )
                                                    ) {
                                                        q =
                                                            snap05(
                                                                Math.max(
                                                                    0,
                                                                    q
                                                                )
                                                            );
                                                        if (
                                                            q >
                                                            0 &&
                                                            q <
                                                            STEP
                                                        )
                                                            q =
                                                                STEP;
                                                    } else {
                                                        q =
                                                            Math.max(
                                                                1,
                                                                Math.floor(
                                                                    q
                                                                )
                                                            );
                                                    }
                                                    return {
                                                        ...r,
                                                        quantity:
                                                            q,
                                                    };
                                                }
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                                        onClick={addLine}
                                        disabled={
                                            !row.inventory_id
                                        }
                                        title={
                                            !row.inventory_id
                                                ? "Selecciona un producto"
                                                : ""
                                        }
                                    >
                                        Agregar
                                    </button>
                                </div>

                                {row.unit && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Unidad:{" "}
                                        <b>
                                            {row.unit.toUpperCase()}
                                        </b>{" "}
                                        {isGram(
                                            row.unit
                                        )
                                            ? "(múltiplos de 0.5)"
                                            : "(enteros)"}
                                    </p>
                                )}

                                {row.inventory_id && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        Stock aprox en
                                        origen:{" "}
                                        <b>
                                            {Number(
                                                row.stock_origin ??
                                                0
                                            ).toLocaleString(
                                                "es-CO"
                                            )}
                                        </b>
                                    </p>
                                )}
                            </div>
                        </div>

                        {row.inventory_id && (
                            <p className="text-sm text-gray-600">
                                Seleccionado:{" "}
                                <b>{row.name}</b>{" "}
                                {row.unit
                                    ? `(${row.unit.toUpperCase()})`
                                    : ""}
                            </p>
                        )}
                    </div>

                    {/* Tarjetas móvil de líneas */}
                    <div className="sm:hidden space-y-3">
                        {form.data.items.length ===
                            0 && (
                                <div className="rounded-xl border bg-white p-4 text-gray-500">
                                    Sin líneas. Agrega
                                    productos desde el
                                    buscador.
                                </div>
                            )}
                        {form.data.items.map(
                            (l, i) => (
                                <div
                                    key={`${l.inventory_id}-${i}`}
                                    className="rounded-xl border bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">
                                                #
                                                {
                                                    l.inventory_id
                                                }
                                            </div>
                                            {l._name && (
                                                <div className="text-xs text-gray-500">
                                                    {
                                                        l._name
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="text-red-600 text-sm"
                                            onClick={() =>
                                                removeLine(
                                                    i
                                                )
                                            }
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <p className="text-[11px] text-gray-500">
                                                Unidad
                                            </p>
                                            <p className="font-medium uppercase">
                                                {l._unit ||
                                                    "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-gray-500">
                                                Cantidad
                                            </p>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="mt-1 border rounded-lg px-3 py-2 w-full"
                                                placeholder={
                                                    isGram(
                                                        l._unit
                                                    )
                                                        ? "0.5"
                                                        : "1"
                                                }
                                                value={
                                                    l.quantity
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    changeQty(
                                                        i,
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                onBlur={(e) =>
                                                    changeQty(
                                                        i,
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {fmtQty(
                                                    l.quantity,
                                                    l._unit
                                                )}{" "}
                                                {l._unit}
                                            </p>
                                        </div>
                                    </div>
                                    {typeof l._stock_origin ===
                                        "number" && (
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                Stock origen
                                                al
                                                seleccionar:{" "}
                                                {Number(
                                                    l._stock_origin
                                                ).toLocaleString(
                                                    "es-CO"
                                                )}
                                            </p>
                                        )}
                                </div>
                            )
                        )}
                    </div>

                    {/* Tabla desktop líneas */}
                    <div className="hidden sm:block bg-white rounded-xl shadow overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                                        Producto
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                                        Unidad
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                                        Cantidad
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {form.data.items.map(
                                    (l, i) => (
                                        <tr
                                            key={`${l.inventory_id}-${i}`}
                                        >
                                            <td className="px-4 py-2">
                                                <div className="font-medium">
                                                    #
                                                    {
                                                        l.inventory_id
                                                    }
                                                </div>
                                                {l._name && (
                                                    <div className="text-xs text-gray-500">
                                                        {
                                                            l._name
                                                        }
                                                    </div>
                                                )}
                                                {typeof l._stock_origin ===
                                                    "number" && (
                                                        <div className="text-[11px] text-gray-400 mt-0.5">
                                                            Stock
                                                            origen
                                                            al
                                                            seleccionar:{" "}
                                                            {Number(
                                                                l._stock_origin
                                                            ).toLocaleString(
                                                                "es-CO"
                                                            )}
                                                        </div>
                                                    )}
                                            </td>
                                            <td className="px-4 py-2 uppercase">
                                                {l._unit ||
                                                    "—"}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="border rounded px-2 py-1 w-28"
                                                    placeholder={
                                                        isGram(
                                                            l._unit
                                                        )
                                                            ? "0.5"
                                                            : "1"
                                                    }
                                                    value={
                                                        l.quantity
                                                    }
                                                    onChange={(
                                                        e
                                                    ) =>
                                                        changeQty(
                                                            i,
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    onBlur={(
                                                        e
                                                    ) =>
                                                        changeQty(
                                                            i,
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                                <span className="ml-2 text-xs text-gray-500">
                                                    {fmtQty(
                                                        l.quantity,
                                                        l._unit
                                                    )}{" "}
                                                    {l._unit}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    type="button"
                                                    className="text-red-600 hover:underline"
                                                    onClick={() =>
                                                        removeLine(
                                                            i
                                                        )
                                                    }
                                                >
                                                    Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}

                                {form.data.items.length ===
                                    0 && (
                                        <tr>
                                            <td
                                                className="px-4 py-6 text-gray-500"
                                                colSpan={4}
                                            >
                                                Sin líneas.
                                                Agrega
                                                productos
                                                desde el
                                                buscador.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>

                    {/* Errores backend items */}
                    {Array.isArray(form.errors.items) ? (
                        <div className="text-red-600 text-sm">
                            {form.errors.items}
                        </div>
                    ) : form.errors.items ? (
                        <div className="text-red-600 text-sm">
                            {form.errors.items}
                        </div>
                    ) : null}

                    {/* Submit */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className={`px-5 py-2 rounded-lg text-white ${canSubmit
                                    ? "bg-green-600"
                                    : "bg-gray-400"
                                }`}
                            disabled={!canSubmit}
                        >
                            {form.processing
                                ? "Procesando…"
                                : "Transferir"}
                        </button>
                    </div>
                </form>
            </div>

            {/* ================== HISTORIAL ================== */}
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
                <h3 className="font-semibold text-xl text-gray-800 dark:text-gray-200">
                    Historial de transferencias
                </h3>

                {/* ----------- FILTROS HISTORIAL ----------- */}
                <form
                    onSubmit={applyFilters}
                    className="bg-white rounded-xl shadow p-4 grid gap-4 sm:grid-cols-5"
                >
                    {/* Dealer */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Dealer destino
                        </label>
                        <select
                            className="mt-1 border rounded-lg px-3 py-2 w-full"
                            value={dealerFilter}
                            onChange={(e) =>
                                setDealerFilter(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Todos
                            </option>
                            {dealerLocations.map(
                                (d) => (
                                    <option
                                        key={d.id}
                                        value={d.id}
                                    >
                                        {(d.user
                                            ?.name ??
                                            "Usuario") +
                                            " — " +
                                            d.name}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Fecha desde */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Desde
                        </label>
                        <input
                            type="date"
                            className="mt-1 border rounded-lg px-3 py-2 w-full"
                            value={fromDate}
                            onChange={(e) =>
                                setFromDate(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    {/* Fecha hasta */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Hasta
                        </label>
                        <input
                            type="date"
                            className="mt-1 border rounded-lg px-3 py-2 w-full"
                            value={toDate}
                            onChange={(e) =>
                                setToDate(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    {/* Botones */}
                    <div className="sm:col-span-1 flex items-end gap-2">
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm w-full"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm w-full"
                            onClick={clearFilters}
                        >
                            Limpiar
                        </button>
                    </div>
                </form>

                {/* Cards móvil historial */}
                <div className="sm:hidden space-y-3">
                    {histRows.length === 0 && (
                        <div className="rounded-xl border bg-white p-4 text-gray-500">
                            Sin transferencias
                            registradas.
                        </div>
                    )}
                    {histRows.map((t) => (
                        <div
                            key={t.id}
                            className="rounded-xl border bg-white p-4"
                        >
                            <div className="flex justify-between items-center">
                                <div className="font-semibold">
                                    #{t.id}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openPreview(
                                                t
                                            )
                                        }
                                        className="p-1.5 rounded hover:bg-gray-100"
                                        title="Ver ítems transferidos"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 text-gray-700"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 5 12 5c4.64 0 8.577 2.51 9.964 6.678.07.21.07.434 0 .644C20.577 16.49 16.64 19 12 19c-4.64 0-8.577-2.51-9.964-6.678z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                    </button>
                                    <div className="text-xs text-gray-500">
                                        {t.created_at
                                            ? new Date(
                                                t.created_at
                                            ).toLocaleString(
                                                "es-CO"
                                            )
                                            : ""}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Desde
                                    </p>
                                    <p>
                                        {t.from?.name ??
                                            "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Hacia
                                    </p>
                                    <p>
                                        {t.to?.name ??
                                            "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Ítems
                                    </p>
                                    <p>
                                        {t.lines_count ??
                                            0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        Unidades
                                    </p>
                                    <p>
                                        {fmtTotal(
                                            t.qty_sum
                                        )}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[11px] text-gray-500">
                                        Nota
                                    </p>
                                    <p className="truncate">
                                        {t.note ||
                                            "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span>
                                    {t.creator
                                        ?.name ??
                                        "—"}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full ${t.status ===
                                            "done"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {t.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabla desktop historial */}
                <div className="hidden sm:block bg-white rounded-xl shadow overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">#</th>
                                <th className="px-4 py-3 text-left">
                                    Fecha
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Desde
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Hacia
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Ítems
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Unidades
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Nota
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Creado por
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Ver
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {histRows.map((t) => (
                                <tr key={t.id}>
                                    <td className="px-4 py-2">
                                        #{t.id}
                                    </td>
                                    <td className="px-4 py-2">
                                        {t.created_at
                                            ? new Date(
                                                t.created_at
                                            ).toLocaleString(
                                                "es-CO"
                                            )
                                            : ""}
                                    </td>
                                    <td className="px-4 py-2">
                                        {t.from?.name ??
                                            "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        {t.to?.name ??
                                            "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        {t.lines_count ??
                                            0}
                                    </td>
                                    <td className="px-4 py-2">
                                        {fmtTotal(
                                            t.qty_sum
                                        )}
                                    </td>
                                    <td
                                        className="px-4 py-2 truncate max-w-[260px]"
                                        title={
                                            t.note ||
                                            ""
                                        }
                                    >
                                        {t.note ||
                                            "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        {t.creator
                                            ?.name ??
                                            "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`px-2 py-1 rounded-full ${t.status ===
                                                    "done"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                        >
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openPreview(
                                                    t
                                                )
                                            }
                                            className="p-1.5 rounded hover:bg-gray-100"
                                            title="Ver ítems transferidos"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 text-gray-700"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.5"
                                                    d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 5 12 5c4.64 0 8.577 2.51 9.964 6.678.07.21.07.434 0 .644C20.577 16.49 16.64 19 12 19c-4.64 0-8.577-2.51-9.964-6.678z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.5"
                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {histRows.length === 0 && (
                                <tr>
                                    <td
                                        className="px-4 py-6 text-gray-500"
                                        colSpan={10}
                                    >
                                        Sin
                                        transferencias
                                        registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación (mantiene filtros con appends en backend) */}
                {histLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {histLinks.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || "#"}
                                preserveScroll
                                className={`px-3 py-1 rounded border
                                    ${link.active
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-700"
                                    }
                                    ${!link.url
                                        ? "opacity-50 pointer-events-none"
                                        : ""
                                    }`}
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ========= MODAL PREVIEW ========= */}
            {preview.open && (
                <div className="fixed inset-0 z-40">
                    {/* backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closePreview}
                    />
                    {/* modal */}
                    <div className="absolute inset-x-4 top-10 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[720px] bg-white rounded-2xl shadow-xl overflow-hidden z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div className="font-semibold">
                                {preview.header ? (
                                    <>
                                        Transferencia #
                                        {
                                            preview
                                                .header
                                                .id
                                        }{" "}
                                        ·{" "}
                                        {
                                            preview
                                                .header
                                                .from
                                        }{" "}
                                        →{" "}
                                        {
                                            preview
                                                .header
                                                .to
                                        }
                                    </>
                                ) : (
                                    "Transferencia"
                                )}
                            </div>
                            <button
                                className="p-1.5 rounded hover:bg-gray-100"
                                onClick={closePreview}
                                aria-label="Cerrar"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 max-h-[70vh] overflow-auto">
                            {preview.loading && (
                                <div className="text-sm text-gray-600">
                                    Cargando ítems…
                                </div>
                            )}
                            {preview.error && (
                                <div className="text-sm text-red-600">
                                    {preview.error}
                                </div>
                            )}

                            {!preview.loading &&
                                !preview.error && (
                                    <>
                                        <div className="text-xs text-gray-500 mb-3">
                                            {preview
                                                .header
                                                ?.created_at
                                                ? new Date(
                                                    preview
                                                        .header
                                                        .created_at
                                                ).toLocaleString(
                                                    "es-CO"
                                                )
                                                : ""}{" "}
                                            · Ítems:{" "}
                                            <b>
                                                {preview
                                                    .header
                                                    ?.lines_count ??
                                                    0}
                                            </b>{" "}
                                            · Unidades:{" "}
                                            <b>
                                                {fmtTotal(
                                                    preview
                                                        .header
                                                        ?.qty_sum
                                                )}
                                            </b>
                                            {preview
                                                .header
                                                ?.note ? (
                                                <>
                                                    {" "}
                                                    · Nota:{" "}
                                                    <span
                                                        title={
                                                            preview
                                                                .header
                                                                .note
                                                        }
                                                    >
                                                        {
                                                            preview
                                                                .header
                                                                .note
                                                        }
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>

                                        <div className="overflow-auto rounded border">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">
                                                            Producto
                                                        </th>
                                                        <th className="px-3 py-2 text-left">
                                                            Unidad
                                                        </th>
                                                        <th className="px-3 py-2 text-left">
                                                            Cantidad
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {preview.items.map(
                                                        (
                                                            it,
                                                            i
                                                        ) => (
                                                            <tr
                                                                key={`${it.inventory_id}-${i}`}
                                                            >
                                                                <td className="px-3 py-2">
                                                                    <div className="font-medium">
                                                                        {
                                                                            it.name
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        #
                                                                        {
                                                                            it.inventory_id
                                                                        }
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 uppercase">
                                                                    {it.unit ||
                                                                        "—"}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {fmtQty(
                                                                        it.quantity,
                                                                        it.unit
                                                                    )}{" "}
                                                                    {
                                                                        it.unit
                                                                    }
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                    {preview
                                                        .items
                                                        .length ===
                                                        0 && (
                                                            <tr>
                                                                <td
                                                                    className="px-3 py-6 text-gray-500"
                                                                    colSpan={
                                                                        3
                                                                    }
                                                                >
                                                                    Sin
                                                                    ítems.
                                                                </td>
                                                            </tr>
                                                        )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                        </div>

                        <div className="px-4 py-3 border-t flex justify-end">
                            <button
                                onClick={closePreview}
                                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
