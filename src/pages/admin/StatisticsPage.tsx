import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { BarChart3, TrendingUp, Package, PieChart, Loader2 } from "lucide-react";

type Borrowing = { id: string; item_name: string | null; status: string; created_at: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  returned: "bg-blue-500",
};

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<number[]>(Array(12).fill(0));
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [popular, setPopular] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("borrowings")
        .select("id, item_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const rows = (data as Borrowing[]) ?? [];

      // Monthly chart (current year)
      const year = new Date().getFullYear();
      const counts = Array(12).fill(0);
      rows.forEach((r) => {
        const d = new Date(r.created_at);
        if (d.getFullYear() === year) counts[d.getMonth()]++;
      });
      setMonthly(counts);

      // Status breakdown
      const sb: Record<string, number> = {};
      rows.forEach((r) => { sb[r.status] = (sb[r.status] ?? 0) + 1; });
      setStatusBreakdown(sb);

      // Popular items
      const ic: Record<string, number> = {};
      rows.forEach((r) => {
        const n = r.item_name ?? "Tidak diketahui";
        ic[n] = (ic[n] ?? 0) + 1;
      });
      setPopular(Object.entries(ic).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8));

      setLoading(false);
    }
    load();
  }, []);

  const maxMonthly = Math.max(...monthly, 1);
  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
  const maxPopular = Math.max(...popular.map((p) => p.count), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Statistik</h1>
        <p className="text-slate-500 text-sm mt-1">Analitik peminjaman tahun {new Date().getFullYear()}</p>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-6">
          {/* Monthly bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Peminjaman per Bulan</h2>
            </div>
            <div className="flex items-end justify-between gap-2 h-56">
              {monthly.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all hover:from-indigo-700 hover:to-indigo-500 relative group"
                      style={{ height: `${(val / maxMonthly) * 100}%`, minHeight: val > 0 ? "4px" : "0" }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {val}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChart className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Status Breakdown</h2>
              </div>
              {Object.keys(statusBreakdown).length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">Belum ada data</p>
              ) : (
                <div className="space-y-4">
                  {/* Stacked bar */}
                  <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                    {Object.entries(statusBreakdown).map(([s, c]) => (
                      <div key={s} className={cn("h-full", STATUS_COLORS[s] ?? "bg-slate-400")}
                        style={{ width: `${(c / totalStatus) * 100}%` }} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(statusBreakdown).map(([s, c]) => (
                      <div key={s} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-3 h-3 rounded-full", STATUS_COLORS[s] ?? "bg-slate-400")} />
                          <span className="text-sm text-slate-700 capitalize">{s}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{c}</span>
                          <span className="text-xs text-slate-400">({Math.round((c / totalStatus) * 100)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Popular items */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Item Terpopuler</h2>
              </div>
              {popular.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {popular.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800 truncate">{p.name}</span>
                          <span className="text-xs text-slate-500 ml-2 shrink-0">{p.count}x</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.count / maxPopular) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Peminjaman</p>
                <p className="text-2xl font-bold text-slate-900">{totalStatus}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Disetujui</p>
                <p className="text-2xl font-bold text-slate-900">{statusBreakdown["approved"] ?? 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{statusBreakdown["pending"] ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
