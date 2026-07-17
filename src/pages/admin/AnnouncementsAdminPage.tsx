import { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { Plus, Pencil, Trash2, X, Search, Loader2, Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
};

const empty: Omit<Announcement, "id" | "created_at"> = { title: "", content: "", is_active: true };

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Omit<Announcement, "id" | "created_at">>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(it: Announcement) { setEditing(it); setForm({ title: it.title, content: it.content, is_active: it.is_active }); setModal(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) await supabase.from("announcements").update(form).eq("id", editing.id);
    else await supabase.from("announcements").insert(form);
    setSaving(false);
    setModal(false);
    load();
  }

  async function remove(it: Announcement) {
    if (!confirm(`Hapus "${it.title}"?`)) return;
    await supabase.from("announcements").delete().eq("id", it.id);
    load();
  }

  const filtered = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengumuman</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola pengumuman sistem</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pengumuman..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" /> Tidak ada pengumuman
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((it) => (
              <div key={it.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 truncate">{it.title}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                      it.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {it.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{it.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(it.created_at).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-slate-200 text-slate-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(it)} className="p-1.5 rounded hover:bg-red-100 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{editing ? "Edit Pengumuman" : "Tambah Pengumuman"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Konten</label>
                <textarea required rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Aktif</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
