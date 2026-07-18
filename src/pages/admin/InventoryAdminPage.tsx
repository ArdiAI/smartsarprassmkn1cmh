import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Package, Plus, Pencil, Trash2, X, Loader2, Search, MapPin, User,
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
  available_quantity: number | null;
  condition: string;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  category?: Category | null;
  admin_users?: { name: string; email: string } | null;
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

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
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
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*, categories(id, name), admin_users!manager_id(name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data inventaris', 'error');
      setLoading(false);
      return;
    }
    setItems((data as unknown as Inventory[]) || []);
    setLoading(false);
  }, []);

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

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchAdminUsers();
  }, [fetchItems, fetchCategories, fetchAdminUsers]);

  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
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
      quantity: item.quantity != null ? String(item.quantity) : '',
      available_quantity: item.available_quantity != null ? String(item.available_quantity) : '',
      condition: item.condition ?? 'good',
      location: item.location ?? '',
      manager_id: item.manager_id ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      quantity: form.quantity ? Number(form.quantity) : 0,
      available_quantity: form.available_quantity ? Number(form.available_quantity) : 0,
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
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan inventaris', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      showToast('Inventaris dihapus', 'success');
      setDeleteId(null);
      await fetchItems();
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus inventaris', 'error');
    }
  };

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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, kode, atau lokasi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
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
              <thead className="bg-slate-50 dark:bg-slate-700/30 text-left text-slate-600 dark:text-slate-300">
                <tr>
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
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {filtered.map(item => {
                  const cc = conditionConfig[item.condition] || conditionConfig.good;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{item.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.quantity} <span className="text-slate-400">(tersedia: {item.available_quantity ?? 0})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', cc.color)}>{cc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.location ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.admin_users?.name ? (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {item.admin_users.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Inventaris' : 'Tambah Inventaris'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama Barang</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Kode</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="input"
                  >
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Jumlah Tersedia</label>
                  <input
                    type="number"
                    min="0"
                    value={form.available_quantity}
                    onChange={e => setForm(f => ({ ...f, available_quantity: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Lokasi</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="input"
                  placeholder="Lokasi penyimpanan"
                />
              </div>

              {/* PJ Barang Dropdown */}
              <div>
                <label className="label">Penanggung Jawab Barang</label>
                <select
                  value={form.manager_id}
                  onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
                  className="input"
                >
                  <option value="">Pilih PJ Barang</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Inventaris?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus item ini?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
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
