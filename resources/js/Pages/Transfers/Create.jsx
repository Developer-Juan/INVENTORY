// resources/js/Pages/Transfers/Create.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Create() {
    const { auth, errors: sharedErrors = {}, dealers = [], history = {} } = usePage().props;

    const histRows = Array.isArray(history) ? history : (history?.data ?? []);
    const histLinks = Array.isArray(history) ? [] : (history?.links ?? []);

    // ----- Inertia form (se envía tal cual al backend) -----
    // resources/js/Pages/Transfers/Create.jsx
    const form = useForm({
        dealer_location_id: "",
        dealer_user_id: "",      // 👈 nuevo
        items: [],
        note: "",
    });

    function onChangeDealer(e) {
        const locId = e.target.value ? Number(e.target.value) : "";
        form.setData("dealer_location_id", locId);

        const d = dealers.find(x => Number(x.id) === Number(locId));
        form.setData("dealer_user_id", d?.user_id ?? ""); // guarda el user_id del dealer
    }


    // ----- Estado para la línea en edición + buscador -----
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]); // resultados del autocomplete
    const [row, setRow] = useState({
        inventory_id: "",
        name: "",
        unit: "",
        quantity: 1,
    });

    // Buscar inventarios (usa tu endpoint inventories.search)
    useEffect(() => {
        let abort = false;

        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        const t = setTimeout(async () => {
            try {
                const base = (typeof route === 'function')
                    ? route('inventories.search')          // Ziggy
                    : '/inventories/search';               // fallback si faltara Ziggy

                const params = new URLSearchParams({ term: query.trim() });
                const res = await fetch(`${base}?${params.toString()}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!abort) setSuggestions(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!abort) setSuggestions([]);
                // opcional: console.error(e);
            }
        }, 250);

        return () => { abort = true; clearTimeout(t); };
    }, [query]);



    function onPickSuggestion(it) {
        // it: { id, name, unit, price, stock }
        setRow({
            inventory_id: it.id,
            name: it.name,
            unit: it.unit || "",
            quantity: 1,
        });
        setQuery(it.name);
        setSuggestions([]);
    }

    function addLine(e) {
        e?.preventDefault?.();
        const id = Number(row.inventory_id);
        const qty = Number(row.quantity);
        if (!id || qty <= 0) return;

        // Si ya existe, acumula cantidad
        const idx = form.data.items.findIndex((l) => Number(l.inventory_id) === id);
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
                { inventory_id: id, quantity: qty, _name: row.name, _unit: row.unit },
            ]);
        }

        // Resetea línea rápida
        setRow({ inventory_id: "", name: "", unit: "", quantity: 1 });
        setQuery("");
        setSuggestions([]);
    }

    function removeLine(index) {
        const copy = [...form.data.items];
        copy.splice(index, 1);
        form.setData("items", copy);
    }

    function changeQty(index, value) {
        const v = Math.max(1, Number(value) || 1);
        const copy = [...form.data.items];
        copy[index] = { ...copy[index], quantity: v };
        form.setData("items", copy);
    }

    function submit(e) {
        e.preventDefault();
        form.post(route("transfers.store"), {
            preserveScroll: true,
        });
    }

    const canSubmit = useMemo(() => {
        return (
            !form.processing &&
            form.data.dealer_location_id &&
            form.data.items.length > 0
        );
    }, [form.processing, form.data.dealer_location_id, form.data.items]);

    return (
        <AuthenticatedLayout
            auth={auth}
            errors={sharedErrors}
            header={<h2 className="font-semibold text-xl">Transferencias de inventario</h2>}
        >
            <Head title="Transferir stock" />
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <form onSubmit={submit} className="space-y-6">
                    {/* Bloque superior */}
                    <div className="bg-white rounded shadow p-4 grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Dealer destino</label>
                            <select
                                className="mt-1 border rounded px-3 py-2 w-full"
                                value={form.data.dealer_location_id}
                                onChange={onChangeDealer}
                            >
                                <option value="">— Selecciona —</option>
                                {dealers.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.user?.name ?? 'Usuario sin nombre'} — {d.name}
                                    </option>
                                ))}
                            </select>
                            {form.errors.dealer_location_id && (
                                <p className="text-red-600 text-xs mt-1">{form.errors.dealer_location_id}</p>
                            )}

                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Nota (opcional)
                            </label>
                            <input
                                className="mt-1 border rounded px-3 py-2 w-full"
                                value={form.data.note}
                                onChange={(e) => form.setData("note", e.target.value)}
                                placeholder="Motivo, referencia, etc."
                            />
                            {form.errors.note && (
                                <p className="text-red-600 text-xs mt-1">{form.errors.note}</p>
                            )}
                        </div>
                    </div>

                    {/* Línea rápida + autocomplete */}
                    <div className="bg-white rounded shadow p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2 relative">
                                <label className="block text-sm font-medium text-gray-700">
                                    Buscar producto
                                </label>
                                <input
                                    className="mt-1 border rounded px-3 py-2 w-full"
                                    placeholder="Escribe al menos 2 letras…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />

                                {/* Dropdown sugerencias */}
                                {suggestions.length > 0 && (
                                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow">
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                                onClick={() => onPickSuggestion(s)}
                                            >
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    ID #{s.id} · {String(s.unit || "").toUpperCase()} ·
                                                    stock aprox: {s.stock ?? 0}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Cantidad
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        className="border rounded px-3 py-2 w-28"
                                        value={row.quantity}
                                        onChange={(e) =>
                                            setRow((r) => ({ ...r, quantity: e.target.value }))
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded bg-blue-600 text-white"
                                        onClick={addLine}
                                        disabled={!row.inventory_id}
                                        title={!row.inventory_id ? "Selecciona un producto" : ""}
                                    >
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Info rápida del ítem seleccionado */}
                        {row.inventory_id && (
                            <p className="text-sm text-gray-600">
                                Seleccionado: <b>{row.name}</b>{" "}
                                {row.unit ? `(${row.unit.toUpperCase()})` : ""}
                            </p>
                        )}
                    </div>

                    {/* Tabla de líneas */}
                    <div className="bg-white rounded shadow overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
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
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {form.data.items.map((l, i) => (
                                    <tr key={`${l.inventory_id}-${i}`}>
                                        <td className="px-4 py-2">
                                            <div className="font-medium">#{l.inventory_id}</div>
                                            {l._name && (
                                                <div className="text-xs text-gray-500">{l._name}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 uppercase">{l._unit || "—"}</td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                className="border rounded px-2 py-1 w-24"
                                                value={l.quantity}
                                                onChange={(e) => changeQty(i, e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                type="button"
                                                className="text-red-600 hover:underline"
                                                onClick={() => removeLine(i)}
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {form.data.items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-gray-500" colSpan={4}>
                                            Sin líneas. Agrega productos desde el buscador.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Errores de backend para items */}
                    {Array.isArray(form.errors.items) ? (
                        <div className="text-red-600 text-sm">{form.errors.items}</div>
                    ) : form.errors.items ? (
                        <div className="text-red-600 text-sm">{form.errors.items}</div>
                    ) : null}

                    {/* Submit */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className={`px-5 py-2 rounded text-white ${canSubmit ? "bg-green-600" : "bg-gray-400"
                                }`}
                            disabled={!canSubmit}
                        >
                            {form.processing ? "Procesando…" : "Transferir"}
                        </button>
                    </div>
                </form>
            </div>
            {/* ================== HISTORIAL ================== */}
            <div className="p-6 max-w-5xl mx-auto space-y-4">
                <h3 className="text-lg font-semibold">Historial de transferencias</h3>

                <div className="bg-white rounded shadow overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">#</th>
                                <th className="px-4 py-3 text-left">Fecha</th>
                                <th className="px-4 py-3 text-left">Desde</th>
                                <th className="px-4 py-3 text-left">Hacia</th>
                                <th className="px-4 py-3 text-left">Ítems</th>
                                <th className="px-4 py-3 text-left">Unidades</th>
                                <th className="px-4 py-3 text-left">Nota</th>
                                <th className="px-4 py-3 text-left">Creado por</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {histRows.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 py-2">#{t.id}</td>
                                    <td className="px-4 py-2">
                                        {t.created_at ? new Date(t.created_at).toLocaleString('es-CO') : ''}
                                    </td>
                                    <td className="px-4 py-2">{t.from?.name ?? '—'}</td>
                                    <td className="px-4 py-2">{t.to?.name ?? '—'}</td>
                                    <td className="px-4 py-2">{t.lines_count ?? 0}</td>
                                    <td className="px-4 py-2">{Number(t.qty_sum ?? 0).toLocaleString('es-CO')}</td>
                                    <td className="px-4 py-2 truncate max-w-[260px]" title={t.note || ''}>
                                        {t.note || '—'}
                                    </td>
                                    <td className="px-4 py-2">{t.creator?.name ?? '—'}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded-full ${t.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {histRows.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-gray-500" colSpan={8}>
                                        Sin transferencias registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {histLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {histLinks.map((link, i) => (
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
        </AuthenticatedLayout>
    );
}
