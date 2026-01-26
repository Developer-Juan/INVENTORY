import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useEffect, useRef, useState } from "react";

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

  // Logs opcionales
  useEffect(() => {
    console.log("[Dashboard]", { from, to, kpi, topProducts, topLocations, seriesDays, payByMethod });
  }, [from, to, kpi, topProducts, topLocations, seriesDays, payByMethod]);

  useEffect(() => {
    const offStart = router.on("start", (e) => console.log("[Inertia] start", e));
    const offSuccess = router.on("success", (e) => console.log("[Inertia] success", e));
    const offError = router.on("error", (e) => console.error("[Inertia] error", e));
    const offFinish = router.on("finish", () => console.log("[Inertia] finish"));
    return () => { offStart(); offSuccess(); offError(); offFinish(); };
  }, []);

  const fmtMoney = (v) =>
    Number(v ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const useCountUp = (value, { duration = 3600, fromZero = true } = {}) => {
    const initial = fromZero ? 0 : Number(value ?? 0);
    const [display, setDisplay] = useState(initial);
    const prevRef = useRef(initial);

    useEffect(() => {
      const from = fromZero ? 0 : (prevRef.current ?? 0);
      const to = Number(value ?? 0);
      if (from === to) {
        setDisplay(to);
        prevRef.current = to;
        return;
      }
      const start = performance.now();
      let rafId = null;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 0.5 - Math.cos(Math.PI * t) / 2;
        const next = from + (to - from) * eased;
        setDisplay(next);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          prevRef.current = to;
          setDisplay(to);
        }
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [value, duration]);

    return display;
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

  const initialFrom = typeof from === "string" && from.length ? from : daysAgoStr(29);
  const initialTo = typeof to === "string" && to.length ? to : todayStr();
  const [range, setRange] = useState({ from: initialFrom, to: initialTo });

  const submitRange = (e) => {
    if (e) e.preventDefault();
    router.get(route("dashboard"), { from: range.from, to: range.to }, { preserveScroll: true });
  };

  const applyQuickRange = (days) => {
    const next = { from: daysAgoStr(days - 1), to: todayStr() };
    setRange(next);
    router.get(route("dashboard"), next, { preserveScroll: true });
  };

  const pieColors = ["#16a34a", "#22c55e", "#65a30d", "#4ade80", "#84cc16", "#15803d", "#a3e635", "#166534"];

  const KpiCard = ({ label, value }) => {
    const animated = useCountUp(value, { fromZero: true });
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          $ {fmtMoney(animated)}
        </p>
      </div>
    );
  };

  return (
    <AuthenticatedLayout
      auth={auth}
      errors={errors}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200">Dashboard</h2>}
    >
      <Head title="Dashboard" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Filtros */}
        <form
          onSubmit={submitRange}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[150px]">
            <label className="block text-sm text-gray-700 dark:text-gray-300">Desde</label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || "" }))}
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm text-gray-700 dark:text-gray-300">Hasta</label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2
                         text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || "" }))}
            />
          </div>
          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => applyQuickRange(7)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(30)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Últimos 30 días
            </button>
            <button className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
              Aplicar
            </button>
          </div>
        </form>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Ventas en el período" value={kpi.salesSum} />
          <KpiCard label="Pagos recibidos" value={kpi.paymentsSum} />
          <KpiCard label="Ticket promedio" value={kpi.ticketAvg} />
        </div>

        {/* Ventas vs Pagos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Ventas vs pagos (diario)</div>
          <div className="h-72 text-gray-800 dark:text-gray-200">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesDays}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 12 }} />
                <YAxis tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v) => `$${fmtMoney(v)}`} />
                <Tooltip formatter={(v) => `$ ${fmtMoney(v)}`} />
                <Legend wrapperStyle={{ color: "inherit" }} />
                <Line type="monotone" dataKey="sales" name="Ventas" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payments" name="Pagos" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top productos + Top ubicaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Productos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Top productos (por cantidad)</div>
            <div className="h-72 text-gray-800 dark:text-gray-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} barCategoryGap="20%">
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} interval={0} tickMargin={8} />
                  <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
                  <Tooltip formatter={(v, name) => name === "qty" ? [v, "Unidades"] : [`${fmtMoney(v)}`, "Monto"]} />
                  <Legend wrapperStyle={{ color: "inherit" }} />
                  {/* Forzar verde con fill/stroke y Cell por barra */}
                  <Bar
                    dataKey="qty"
                    name="Unidades"
                    fill="#16a34a"
                    stroke="#14532d"
                    strokeWidth={1}
                    fillOpacity={1}
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={`prod-${i}`} fill={i % 2 ? "#16a34a" : "#22c55e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ubicaciones */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Ventas por ubicación (monto)</div>
            <div className="h-72 text-gray-800 dark:text-gray-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLocations} barCategoryGap="20%">
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} interval={0} tickMargin={8} />
                  <YAxis tick={{ fill: "currentColor", fontSize: 12 }} tickFormatter={(v) => `$${fmtMoney(v)}`} />
                  <Tooltip formatter={(v) => `$ ${fmtMoney(v)}`} />
                  <Legend wrapperStyle={{ color: "inherit" }} />
                  <Bar
                    dataKey="amount"
                    name="Monto"
                    fill="#22c55e"
                    stroke="#166534"
                    strokeWidth={1}
                    fillOpacity={1}
                  >
                    {topLocations.map((_, i) => (
                      <Cell key={`loc-${i}`} fill={i % 2 ? "#22c55e" : "#84cc16"} />
                    ))}
                  </Bar>
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
