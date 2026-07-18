import { useEffect, useState } from 'react';
import {
  Package, Plus, Search, Pencil, Trash2, X, MapPin, Tag,
  Boxes, AlertCircle, UserCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: string | null;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  available_quantity: number | null;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  category?: { name: string } | null;
  admin_users?: { name: string; email: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FormData {
  name: string;
  code: string;
  description: string;
  category_id: string;
  quantity: string;
  available_quantity: string;
  condition: string;
  location: string;
  manager_id: string;
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
  manager_id: '',
};

const conditionConfig: Record<string, { label: string; classes: string }> = {
  good: { label: 'Baik', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Cukup', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('inventory', 'create');
  const canUpdate = hasPermission('inventory', 'update');
  const canDelete = hasPermission('inventory', 'delete');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const [invRes, catRes, adminRes] = await Promise.all([
        supabase
          .from('inventory')
          .select(`
            id, code, name, category_id, quantity, condition, location, image_url,
            purchase_date, price, description, created_at, available_quantity,
            manager_name, manager_role, manager_id,
            category:category_id(name),
            admin_users!manager_id(name, email)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
      ]);

      if (invRes.error) throw invRes.error;
      if (catRes.error) throw catRes.error;
      if (adminRes.error) throw adminRes.error;

      setItems((invRes.data as unknown as InventoryItem[]) ?? []);
      setCategories((catRes.data as unknown as Category[]) ?? []);
      setAdminUsers((adminRes.data as unknown as AdminUser[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat data inventaris', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (item.location ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name ?? '',
      code: item.code ?? '',
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      quantity: String(item.quantity ?? ''),
      available_quantity: String(item.available_quantity ?? ''),
      condition: item.condition ?? 'good',
      location: item.location ?? '',
      manager_id: item.manager_id ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama barang wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        quantity: form.quantity ? Number(form.quantity) : 0,
        available_quantity: form.available_quantity ? Number(form.available_quantity) : 0,
        condition: form.condition,
        location: form.location.trim() || null,
        manager_id: form.manager_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Inventaris berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
        showToast('Inventaris berhasil ditambahkan', 'success');
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
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Inventaris berhasil dihapus', 'success');
      setDeleteId(null);
      await fetchAll();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus inventaris', 'error');
    }
  }

  function getPjName(item: InventoryItem): string {
    if (item.admin_users && item.admin_users.name) return item.admin_users.name;
    if (item.manager_name) return item.manager_name;
    return '';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola data barang dan inventaris</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, kode, atau lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tidak ada data inventaris</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Kode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tersedia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Kondisi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Lokasi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">PJ Barang</th>
                  {(canUpdate || canDelete) && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((item) => {
                  const cond = conditionConfig[item.condition ?? 'good'] ?? conditionConfig.good;
                  const pjName = getPjName(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                        {item.description ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{item.code ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {item.category?.name ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{item.available_quantity ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', cond.classes)}>
                          {cond.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{item.location ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {pjName ? (
                          <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <UserCircle className="w-4 h-4 text-blue-500" />
                            {pjName}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <button
                                onClick={() => openEdit(item)}
                                className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteId(item.id)}
                                className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Barang *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan nama barang"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kode Barang</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: INV-001"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Deskripsi singkat barang"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity & Available */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jumlah</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tersedia</label>
                  <input
                    type="number"
                    min="0"
                    value={form.available_quantity}
                    onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kondisi</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="good">Baik</option>
                  <option value="fair">Cukup</option>
                  <option value="poor">Rusak</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lokasi</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lokasi penyimpanan"
                />
              </div>

              {/* PJ Barang Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Penanggung Jawab Barang</label>
                <select
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih PJ Barang</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Barang?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
