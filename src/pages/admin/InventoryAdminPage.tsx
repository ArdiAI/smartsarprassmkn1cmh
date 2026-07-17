import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface InventoryRow {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  available_quantity: number | null;
  condition: string;
  location: string | null;
  description: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
}

const conditionColors: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const conditionLabels: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Rusak',
};

interface FormData {
  name: string;
  code: string;
  description: string;
  category_id: string;
  quantity: string;
  available_quantity: string;
  condition: string;
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

export default function InventoryAdminPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, catRes] = await Promise.all([
      supabase.from('inventory').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name', { ascending: true }),
    ]);

    if (invRes.error) {
      showToast('Gagal memuat inventaris', 'error');
    } else {
      setItems((invRes.data as unknown as InventoryRow[]) ?? []);
    }
    setCategories((catRes.data as unknown as CategoryRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code ?? '').toLowerCase().includes(q) ||
      (item.location ?? '').toLowerCase().includes(q)
    );
  });

  const categoryMap: Record<string, string> = {};
  categories.forEach(c => {
    categoryMap[c.id] = c.name;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryRow) => {
    setForm({
      name: item.name ?? '',
      code: item.code ?? '',
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      quantity: String(item.quantity ?? ''),
      available_quantity: String(item.available_quantity ?? ''),
      condition: item.condition ?? 'good',
      location: item.location ?? '',
    });
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }

    setSaving(true);
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

    if (editingId) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui item', 'error');
      } else {
        showToast('Item diperbarui', 'success');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) {
        showToast('Gagal menambahkan item', 'error');
      } else {
        showToast('Item ditambahkan', 'success');
        setModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus item ini?')) return;
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus item', 'error');
    } else {
      showToast('Item dihapus', 'success');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inventaris</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data barang dan inventaris
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Tambah Item
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, kode, atau lokasi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <Package className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Tidak ada item ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kode</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Jumlah</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tersedia</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Kondisi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Lokasi</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.code ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {item.category_id ? (categoryMap[item.category_id] ?? '-') : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.available_quantity ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg text-xs font-medium',
                          conditionColors[item.condition] ?? conditionColors.good
                        )}
                      >
                        {conditionLabels[item.condition] ?? item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.location ?? '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Item' : 'Tambah Item'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kode</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tersedia</label>
                  <input
                    type="number"
                    value={form.available_quantity}
                    onChange={e => setForm({ ...form, available_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
