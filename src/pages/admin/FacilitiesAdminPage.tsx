import { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { Plus, Pencil, Trash2, X, Search, Loader2, Building2 } from "lucide-react";

type Facility = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  status: string;
  category: string | null;
  facility_type: string | null;
  workflow_template_id: string | null;
};

type Template = { id: string; name: string };

const empty: Omit<Facility, "id"> = {
  name: "", location: "", capacity: 0, status: "available",
  category: "", facility_type: "", workflow_template_id: null,
};

export default function FacilitiesAdminPage() {
  const [items, setItems] = useState<Facility[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<Omit<Facility, "id">>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    supabase.from("workflow_templates").select("id, name").then(({ data }) => setTemplates((data as Template[]) ?? []));
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("facilities").select("*").order("created_at", { ascending: false });
    setItems((data as Facility[]) ?? []);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(it: Facility) { setEditing(it); setForm({ ...it }); setModal(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) await supabase.from("facilities").update(form).eq("id", editing.id);
    else await supabase.from("facilities").insert(form);
    setSaving(false);
    setModal(false);
    load();
  }

  async function remove(it: Facility) {
    if (!confirm(`Hapus "${it.name}"?`)) return;
    await supabase.from("facilities").delete().eq("id", it.id);
    load();
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facilities</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola fasilitas dan ruangan</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari fasilitas..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" /> Tidak ada data
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Kapasitas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
                    <td className="px-4 py-3 text-slate-600">{it.location ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{it.capacity ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        it.status === "available" && "bg-emerald-100 text-emerald-700",
                        it.status === "occupied" && "bg-amber-100 text-amber-700",
                        it.status === "maintenance" && "bg-red-100 text-red-700",
                        !["available", "occupied", "maintenance"].includes(it.status) && "bg-slate-100 text-slate-700",
                      )}>{it.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{it.facility_type ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(it)} className="p-1.5 rounded hover:bg-slate-200 text-slate-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(it)} className="p-1.5 rounded hover:bg-red-100 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{editing ? "Edit Facility" : "Tambah Facility"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                  <input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kapasitas</label>
                  <input type="number" min={0} value={form.capacity ?? 0} onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipe</label>
                  <input value={form.facility_type ?? ""} onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                  <input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Template</label>
                  <select value={form.workflow_template_id ?? ""} onChange={(e) => setForm({ ...form, workflow_template_id: e.target.value || null })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Tidak ada —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
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
