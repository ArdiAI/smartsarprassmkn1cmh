import { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { Search, Loader2, MessageSquare, X, Send } from "lucide-react";

type Aspirasi = {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  response: string | null;
  user_name: string | null;
  created_at: string;
};

const STATUSES = ["pending", "reviewing", "responded", "closed"];

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<Aspirasi | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("aspirasi").select("*").order("created_at", { ascending: false });
    setItems((data as Aspirasi[]) ?? []);
    setLoading(false);
  }

  function openDetail(it: Aspirasi) {
    setDetail(it);
    setResponse(it.response ?? "");
    setStatus(it.status);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    await supabase.from("aspirasi").update({ response, status }).eq("id", detail.id);
    setSaving(false);
    setDetail(null);
    load();
  }

  const filtered = items.filter((a) => {
    const matchSearch = (a.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.user_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || a.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Aspirasi</h1>
        <p className="text-slate-500 text-sm mt-1">Tanggapi aspirasi pengguna</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari aspirasi..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">Semua</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" /> Tidak ada aspirasi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Judul</th>
                  <th className="px-4 py-3 font-medium">Pengirim</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.title ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{a.user_name ?? "Anonim"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        a.status === "pending" && "bg-amber-100 text-amber-700",
                        a.status === "reviewing" && "bg-blue-100 text-blue-700",
                        a.status === "responded" && "bg-emerald-100 text-emerald-700",
                        a.status === "closed" && "bg-slate-100 text-slate-600",
                      )}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(a.created_at).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDetail(a)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs">
                        Tanggapi
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Tanggapi Aspirasi</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Judul</p>
                <p className="font-medium text-slate-900">{detail.title ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pengirim</p>
                <p className="text-slate-800">{detail.user_name ?? "Anonim"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Isi</p>
                <p className="text-slate-800 whitespace-pre-wrap">{detail.content ?? "—"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggapan</label>
                <textarea rows={4} value={response} onChange={(e) => setResponse(e.target.value)}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
