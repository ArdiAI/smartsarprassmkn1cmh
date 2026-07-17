import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, X, Package, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface InventoryItem {
  id: string; code: string; name: string; category_id: string | null;
  quantity: number; available_quantity: number; condition: string; location: string;
  categories: { name: string }[] | null;
}
interface Category { id: string; name: string; }
interface FormState {
  name: string; code: string; quantity: string; available_quantity: string;
  condition: string; category_id: string; location: string;
}
const emptyForm: FormState = { name: '', code: '', quantity: '0', available_quantity: '0', condition: 'good', category_id: '', location: '' };
const conditionLabel: Record<string, string> = { good: 'Baik', fair: 'Layak', poor: 'Rusak' };
const conditionColor: Record<string, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function InventoryAdminPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const [{ data: inv }, { data: cats }] = await Promise.all([
      supabase.from('inventory').select('*, categories(name)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]);
    setItems((inv as unknown as InventoryItem[]) || []);
    setCategories((cats as Category[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name, code: item.code, quantity: String(item.quantity),
      available_quantity: String(item.available_quantity ?? item.quantity),
      condition: item.condition || 'good', category_id: item.category_id || '', location: item.location || '',
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name, code: form.code, quantity: Number(form.quantity),
      available_quantity: Number(form.available_quantity), condition: form.condition,
      category_id: form.category_id || null, location: form.location,
    };
    if (editing) {
      await supabase.from('inventory').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('inventory').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetch();
  }

  async function remove(id: string) {
    if (!confirm('Hapus item ini?')) return;
    await supabase.from('inventory').delete().eq('id', id);
    fetch();
  }

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola data barang inventaris</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau kode..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada data</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Kode</th>
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
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.code || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.categories?.[0]?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.available_quantity ?? item.quantity}</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', conditionColor[item.condition] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{conditionLabel[item.condition] || item.condition}</span></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.location || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(item.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Item' : 'Tambah Item'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kode</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="">-</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Jumlah</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tersedia</label>
                <input type="number" value={form.available_quantity} onChange={e => setForm(f => ({ ...f, available_quantity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kondisi</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="good">Baik</option><option value="fair">Layak</option><option value="poor">Rusak</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
