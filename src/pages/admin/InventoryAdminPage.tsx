import { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../utils/cn";
import { Plus, Pencil, Trash2, X, Search, Loader2, Package } from "lucide-react";

type Inventory = {
  id: string;
  name: string;
  code: string;
  quantity: number;
  available_quantity: number;
  condition: string;
  category_id: string | null;
  location: string | null;
};

type Category = { id: string; name: string };

const empty: Omit<Inventory, "id"> = {
  name: "", code: "", quantity: 0, available_quantity: 0,
  condition: "baik", category_id: null, location: "",
};

export default function InventoryAdminPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState<Omit<Inventory, "id">>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    supabase.from("categories").select("id, name").then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
    setItems((data as Inventory[]) ?? []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(empty);
    setModal(true);
  }

  function openEdit(it: Inventory) {
    setEditing(it);
    setForm({ ...it });
    setModal(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await supabase.from("inventory").update(form).eq("id", editing.id);
    } else {
      await supabase.from("inventory").insert(form);
    }
    setSaving(false);
    setModal(false);
    load();
  }

  async function remove(it: Inventory) {
    if (!confirm(`Hapus "${it.name}"?`)) return;
    await supabase.from("inventory").delete().eq("id", it.id);
    load();
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola daftar sarana dan prasarana</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau kode..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Tidak ada data
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Tersedia</th>
                  <th className="px-4 py-3 font-medium">Kondisi</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
                    <td className="px-4 py-3 text-slate-600">{it.code}</td>
                    <td className="px-4 py-3 text-slate-600">{it.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{it.available_quantity}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        it.condition === "baik" && "bg-emerald-100 text-emerald-700",
                        it.condition === "rusak" && "bg-red-100 text-red-700",
                        it.condition === "perbaikan" && "bg-amber-100 text-amber-700",
                      )}>{it.condition}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{it.location ?? "—"}</td>
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
              <h2 className="font-semibold text-slate-900">{editing ? "Edit Inventory" : "Tambah Inventory"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kondisi</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="baik">Baik</option>
                    <option value="rusak">Rusak</option>
                    <option value="perbaikan">Perbaikan</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tersedia</label>
                  <input type="number" min={0} value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: +e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Tidak ada —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                <input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
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
