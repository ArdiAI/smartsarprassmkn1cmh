import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Package, Plus, Pencil, Trash2, Loader2, Search, X, UserCircle,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface AdminUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Inventory {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: string;
  location: string;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  available_quantity: number;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  category?: Category | null;
  admin_users?: { name: string; email: string } | null;
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const emptyForm = {
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

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory', 'create');
  const canUpdate = hasPermission('inventory', 'update');
  const canDelete = hasPermission('inventory', 'delete');

  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    setCategories((data as unknown as Category[]) || []);
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    const { data } = await supabase
      .from('admin_users')
      .select('id, name, email, role')
      .eq('is_active', true)
      .order('name');
    setAdminUsers((data as unknown as AdminUserOption[]) || []);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*, category:categories(id, name), admin_users!manager_id(name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data inventaris', 'error');
      setLoading(false);
      return;
    }
    setItems((data as unknown as Inventory[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchAdminUsers();
  }, [fetchItems, fetchCategories, fetchAdminUsers]);

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.code?.toLowerCase().includes(q) ||
      i.location?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: Inventory) => {
    setEditing(item);
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
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      showToast('Nama dan kode wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description || null,
      category_id: form.category_id || null,
      quantity: Number(form.quantity) || 0,
      available_quantity: Number(form.available_quantity) || 0,
      condition: form.condition,
      location: form.location || null,
      manager_id: form.manager_id || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Inventaris diperbarui', 'success');
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
        showToast('Inventaris ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchItems();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan inventaris', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Inventory) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
    if (error) {
      showToast('Gagal menghapus inventaris', 'error');
      return;
    }
    showToast('Inventaris dihapus', 'success');
    await fetchItems();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data barang dan inventaris</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama, kode, atau lokasi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada inventaris</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Kondisi</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">PJ Barang</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const cc = conditionConfig[item.condition] || conditionConfig.good;
                  const pjName = item.admin_users?.name || item.manager_name;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{item.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.available_quantity}/{item.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', cc.color)}>{cc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.location ?? '-'}</td>
                      <td className="px-4 py-3">
                        {pjName ? (
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <UserCircle className="w-4 h-4 text-slate-400" />
                            <span className="text-xs">{pjName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(item)}
                              className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Inventaris' : 'Tambah Inventaris'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nama *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Kode *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Jumlah Tersedia</label>
                  <input
                    type="number"
                    value={form.available_quantity}
                    onChange={e => setForm({ ...form, available_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Lokasi</label>
                  <input
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Penanggung Jawab Barang</label>
                <select
                  value={form.manager_id}
                  onChange={e => setForm({ ...form, manager_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih PJ Barang</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
