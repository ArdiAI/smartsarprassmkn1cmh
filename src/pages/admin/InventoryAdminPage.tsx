import { useEffect, useState } from 'react';
import {
  Package, Plus, Search, Pencil, Trash2, X, Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  available_quantity: number | null;
  condition: 'good' | 'fair' | 'poor' | null;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  manager_name: string | null;
  manager_role: string | null;
  category?: Category | null;
}

interface FormData {
  id?: string;
  name: string;
  code: string;
  description: string;
  category_id: string;
  quantity: string;
  available_quantity: string;
  condition: 'good' | 'fair' | 'poor';
  location: string;
}

const emptyForm: FormData = {
  name: '',
  code: '',
  description: '',
  category_id: '',
  quantity: '',
  available_quantity: '',
  condition: 'good',
  location: '',
};

const conditionConfig: Record<string, { label: string; class: string }> = {
  good: { label: 'Baik', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  fair: { label: 'Cukup', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  poor: { label: 'Rusak', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function InventoryAdminPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        supabase
          .from('inventory')
          .select('*, category:categories(*)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
      ]);

      if (invRes.error) throw invRes.error;
      if (catRes.error) throw catRes.error;

      setItems((invRes.data as unknown as InventoryItem[]) || []);
      setCategories((catRes.data as unknown as Category[]) || []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
      showToast('Gagal memuat data inventaris', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setForm({
      id: item.id,
      name: item.name ?? '',
      code: item.code ?? '',
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      quantity: String(item.quantity ?? ''),
      available_quantity: String(item.available_quantity ?? ''),
      condition: item.condition ?? 'good',
      location: item.location ?? '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('Nama item wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        quantity: parseInt(form.quantity) || 0,
        available_quantity: parseInt(form.available_quantity) || 0,
        condition: form.condition,
        location: form.location.trim() || null,
      };

      if (form.id) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', form.id);
        if (error) throw error;
        showToast('Inventaris diperbarui', 'success');
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
        showToast('Inventaris ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan inventaris', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Inventaris dihapus', 'success');
      setDeleteId(null);
      await fetchAll();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus inventaris', 'error');
    } finally {
      setSaving(false);
    }
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      item.category?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data barang dan inventaris
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Item</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, kode, lokasi, atau kategori..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Tidak ada inventaris</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Kode</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Nama</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Jumlah</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Tersedia</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Kondisi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Lokasi</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{item.code ?? '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.available_quantity ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', conditionConfig[item.condition ?? 'good'].class)}>
                        {conditionConfig[item.condition ?? 'good'].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.location ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {form.id ? 'Edit Item' : 'Tambah Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Nama Item *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Kode</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Jumlah</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Tersedia</label>
                  <input
                    type="number"
                    value={form.available_quantity}
                    onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value as FormData['condition'] })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Lokasi</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Hapus Item?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
