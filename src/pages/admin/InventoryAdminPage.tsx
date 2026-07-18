import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  Package, Plus, Pencil, Trash2, X, Loader2, Search, MapPin, User,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface AdminUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InventoryItem {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number | null;
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

const emptyForm = {
  name: '',
  code: '',
  description: '',
  category_id: '',
  quantity: 0,
  available_quantity: 0,
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('inventory', 'create');
  const canUpdate = hasPermission('inventory', 'update');
  const canDelete = hasPermission('inventory', 'delete');

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
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
      .select('*, category:categories(name), admin_users!manager_id(name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat inventaris', 'error');
    } else {
      setItems((data as unknown as InventoryItem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchAdminUsers();
    fetchItems();
  }, [fetchCategories, fetchAdminUsers, fetchItems]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      category_id: item.category_id || '',
      quantity: item.quantity ?? 0,
      available_quantity: item.available_quantity ?? 0,
      condition: item.condition || 'good',
      location: item.location || '',
      manager_id: item.manager_id || '',
    });
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Nama barang wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code || null,
      description: form.description || null,
      category_id: form.category_id || null,
      quantity: Number(form.quantity) || 0,
      available_quantity: Number(form.available_quantity) || 0,
      condition: form.condition,
      location: form.location || null,
      manager_id: form.manager_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui barang', 'error');
      } else {
        showToast('Barang diperbarui', 'success');
        setModalOpen(false);
        await fetchItems();
      }
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) {
        showToast('Gagal menambah barang', 'error');
      } else {
        showToast('Barang ditambahkan', 'success');
        setModalOpen(false);
        await fetchItems();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
    if (error) {
      showToast('Gagal menghapus barang', 'error');
    } else {
      showToast('Barang dihapus', 'success');
      setDeleteId(null);
      await fetchItems();
    }
  };

  const filtered = items.filter(item => {
    if (categoryFilter !== 'all' && item.category_id !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola daftar barang dan penanggung jawabnya</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, atau lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Kategori</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada barang</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/30 text-left text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Tersedia</th>
                  <th className="px-4 py-3 font-medium">Kondisi</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">PJ Barang</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(item => {
                  const cond = conditionConfig[item.condition || 'good'] || conditionConfig.good;
                  const pjName = item.admin_users?.name || item.manager_name;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.code || '-'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.category?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.quantity ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.available_quantity ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cond.color}`}>{cond.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.location}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {pjName ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" /> {pjName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(item)}
                              className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Barang</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Contoh: Proyektor Epson" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Kode</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input" placeholder="Contoh: INV-001" />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input">
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Jumlah</label>
                  <input type="number" min={0} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="input" />
                </div>
                <div>
                  <label className="label">Tersedia</label>
                  <input type="number" min={0} value={form.available_quantity} onChange={e => setForm({ ...form, available_quantity: Number(e.target.value) })} className="input" />
                </div>
                <div>
                  <label className="label">Kondisi</label>
                  <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="input">
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" placeholder="Contoh: Gudang A" />
              </div>
              <div>
                <label className="label">Penanggung Jawab Barang</label>
                <select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })} className="input">
                  <option value="">Pilih PJ Barang</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input" placeholder="Deskripsi barang..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Barang?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Barang yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
