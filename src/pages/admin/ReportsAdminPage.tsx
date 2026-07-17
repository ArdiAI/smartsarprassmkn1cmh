import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { Search, Loader2, AlertTriangle, Filter, X } from "lucide-react";

type Report = {
  id: string;
  item_name: string | null;
  description: string | null;
  status: string;
  reporter_name: string | null;
  created_at: string;
};

const STATUSES = ["pending", "reviewing", "in_progress", "resolved", "rejected"];

export default function ReportsAdminPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<Report | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("damage_reports").select("*").order("created_at", { ascending: false });
    setItems((data as Report[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    await supabase.from("damage_reports").update({ status }).eq("id", id);
    setUpdating(false);
    setDetail(null);
    load();
  }

  const filtered = items.filter((r) => {
    const matchSearch = (r.item_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.reporter_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Damage Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola laporan kerusakan</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari laporan..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">Semua</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" /> Tidak ada laporan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Pelapor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.item_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reporter_name ?? "Anonim"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        r.status === "pending" && "bg-amber-100 text-amber-700",
                        r.status === "reviewing" && "bg-blue-100 text-blue-700",
                        r.status === "in_progress" && "bg-violet-100 text-violet-700",
                        r.status === "resolved" && "bg-emerald-100 text-emerald-700",
                        r.status === "rejected" && "bg-red-100 text-red-700",
                      )}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetail(r)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs">
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Detail Laporan</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Item</p>
                <p className="font-medium text-slate-900">{detail.item_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pelapor</p>
                <p className="text-slate-800">{detail.reporter_name ?? "Anonim"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Deskripsi</p>
                <p className="text-slate-800 whitespace-pre-wrap">{detail.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tanggal</p>
                <p className="text-slate-800">{new Date(detail.created_at).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ubah Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s} disabled={updating} onClick={() => updateStatus(detail.id, s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
                        detail.status === s
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100"
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
