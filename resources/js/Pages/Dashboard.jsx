import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const {
    auth,
    errors,
    from,
    to,
    topProducts = [],
    topLocations = [],
    seriesDays = [],
    payByMethod = [],
    kpi = { salesSum: 0, paymentsSum: 0, ticketAvg: 0 },
  } = usePage().props;

  // ===== DEBUG: ver datos cuando cambian =====
  useEffect(() => {
    console.log("[Dashboard] props recibidas:", { from, to, kpi });
    console.log("[Dashboard] topProducts:", topProducts);
    console.log("[Dashboard] topLocations:", topLocations);
    console.log("[Dashboard] seriesDays:", seriesDays);
    console.log("[Dashboard] payByMethod:", payByMethod);
    // Útil para tablas rápidas en consola:
    if (Array.isArray(seriesDays)) console.table(seriesDays);
  }, [from, to, topProducts, topLocations, seriesDays, payByMethod, kpi]);

  // ===== DEBUG: eventos de navegación de Inertia =====
  useEffect(() => {
    const offStart = router.on("start", (e) => console.log("[Inertia] start", e));
    const offSuccess = router.on("success", (e) => console.log("[Inertia] success", e));
    const offError = router.on("error", (e) => console.error("[Inertia] error", e));
    const offFinish = router.on("finish", () => console.log("[Inertia] finish"));

    return () => { offStart(); offSuccess(); offError(); offFinish(); };
  }, []);

  // Helpers
  const fmtMoney = (v) =>
    Number(v ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgoStr = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  // Fechas SIEMPRE como strings (controlados)
  const initialFrom = typeof from === "string" && from.length ? from : daysAgoStr(29);
  const initialTo = typeof to === "string" && to.length ? to : todayStr();
  const [range, setRange] = useState({ from: initialFrom, to: initialTo });

  const submitRange = (e) => {
    e.preventDefault();
    router.get(route("dashboard"), { from: range.from, to: range.to }, { preserveScroll: true });
  };

  useEffect(() => {
    console.log({ topProducts, topLocations, seriesDays, payByMethod, kpi });
  }, [topProducts, topLocations, seriesDays, payByMethod, kpi]);

  const pieColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#fb7185", "#84cc16"];

  return (
    <AuthenticatedLayout
      auth={auth}
      errors={errors}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Dashboard</h2>}
    >
      <Head title="Dashboard" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Panel de depuración opcional */}
        {/* <details className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <summary className="cursor-pointer">DEBUG (datos crudos)</summary>
          <pre className="text-xs overflow-auto mt-2">
            {JSON.stringify({ from, to, kpi, topProducts, topLocations, seriesDays, payByMethod }, null, 2)}
          </pre>
        </details> */}

        {/* Filtro fechas */}
        <form
          onSubmit={submitRange}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Desde</label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || "" }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300">Hasta</label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || "" }))}
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setRange({ from: daysAgoStr(6), to: todayStr() })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => setRange({ from: daysAgoStr(29), to: todayStr() })}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Últimos 30 días
            </button>
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
              Aplicar
            </button>
          </div>
        </form>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Ventas en el período</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">$ {fmtMoney(kpi.salesSum)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pagos recibidos</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">$ {fmtMoney(kpi.paymentsSum)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Ticket promedio</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">$ {fmtMoney(kpi.ticketAvg)}</p>
          </div>
        </div>

        {/* Ventas vs Pagos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Ventas vs pagos (diario)</div>
          <div className="h-72 text-gray-800 dark:text-gray-200">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesDays}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fill: "currentColor" }} />
                <YAxis tick={{ fill: "currentColor" }} tickFormatter={(v) => `$${fmtMoney(v)}`} />
                <Tooltip formatter={(v) => `$ ${fmtMoney(v)}`} />
                <Legend wrapperStyle={{ color: "inherit" }} />
                <Line type="monotone" dataKey="sales" name="Ventas" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payments" name="Pagos" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top productos + Top ubicaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Top productos (por cantidad)</div>
            <div className="h-72 text-gray-800 dark:text-gray-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: "currentColor" }} />
                  <YAxis tick={{ fill: "currentColor" }} />
                  <Tooltip formatter={(v, name) => name === "qty" ? [v, "Unidades"] : [`$ ${fmtMoney(v)}`, "Monto"]} />
                  <Legend wrapperStyle={{ color: "inherit" }} />
                  <Bar dataKey="qty" name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Top ubicaciones (por monto)</div>
            <div className="h-72 text-gray-800 dark:text-gray-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLocations}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: "currentColor" }} />
                  <YAxis tick={{ fill: "currentColor" }} tickFormatter={(v) => `$${fmtMoney(v)}`} />
                  <Tooltip formatter={(v) => `$ ${fmtMoney(v)}`} />
                  <Legend wrapperStyle={{ color: "inherit" }} />
                  <Bar dataKey="amount" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Métodos de pago</div>
          <div className="h-80 text-gray-800 dark:text-gray-200">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payByMethod}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {payByMethod.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$ ${fmtMoney(v)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
