import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { Search, Plus, Pencil, Trash2, Package, X, AlertTriangle } from 'lucide-react';

interface Inventory {
  id: string;
  name: string;
  code: string;
  quantity: number;
  available_quantity: number;
  condition: string;
  category_id: string | null;
  location: string;
}
interface Category { id: string; name: string; }

const CONDITIONS: Record<string, string> = { good: 'Baik', fair: 'Cukup', poor: 'Rusak' };
const CONDITION_COLORS: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY: Omit<Inventory, 'id'> = { name: '', code: '', quantity: 1, available_quantity: 1, condition: 'good', category_id: null, location: '' };

export default function InventoryAdminPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [invRes, catRes] = await Promise.all([
      supabase.from('inventory').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name'),
    ]);
    if (invRes.data) setItems(invRes.data as Inventory[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  }

  function openAdd() { setEditId(null); setForm(EMPTY); setError(''); setModalOpen(true); }
  function openEdit(item: Inventory) { setEditId(item.id); setForm({ ...item }); setError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      if (!form.name.trim() || !form.code.trim()) throw new Error('Nama dan kode wajib diisi');
      const payload = { ...form, quantity: Number(form.quantity), available_quantity: Number(form.available_quantity) };
      if (editId) {
        const { error: e } = await supabase.from('inventory').update(payload).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('inventory').insert(payload);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus item ini?')) return;
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    i.location.toLowerCase().includes(search.toLowerCase())
  );

  const catName = (id: string | null) => categories.find(c => c.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Inventaris</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Tambah, ubah, dan hapus item inventaris</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Item
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Cari nama, kode, lokasi..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Kode</th>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium">Kategori</th>
                <th className="text-left px-4 py-3 font-medium">Qty</th>
                <th className="text-left px-4 py-3 font-medium">Tersedia</th>
                <th className="text-left px-4 py-3 font-medium">Kondisi</th>
                <th className="text-left px-4 py-3 font-medium">Lokasi</th>
                <th className="text-right px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{item.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{catName(item.category_id)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.available_quantity}</td>
                  <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', CONDITION_COLORS[item.condition])}>{CONDITIONS[item.condition] || item.condition}</span></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.location || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-200"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center"><Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-slate-500 dark:text-slate-400">Tidak ada data</p></div>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Edit Item' : 'Tambah Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama" value={form.name} onChange={v => setForm({ ...form, name: v })} />
                <Field label="Kode" value={form.code} onChange={v => setForm({ ...form, code: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah" type="number" value={String(form.quantity)} onChange={v => setForm({ ...form, quantity: Number(v) })} />
                <Field label="Tersedia" type="number" value={String(form.available_quantity)} onChange={v => setForm({ ...form, available_quantity: Number(v) })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kondisi</label>
                <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="good">Baik</option><option value="fair">Cukup</option><option value="poor">Rusak</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="">-</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Field label="Lokasi" value={form.location} onChange={v => setForm({ ...form, location: v })} />
              {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><AlertTriangle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
    </div>
  );
}
