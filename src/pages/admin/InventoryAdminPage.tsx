import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Plus, Pencil, Trash2, Search, Loader2, Package, X, AlertCircle,
} from 'lucide-react';

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
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InventoryWithManager extends Inventory {
  manager?: { name: string; email: string } | null;
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  fair: { label: 'Cukup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  poor: { label: 'Rusak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const emptyForm = {
  code: '',
  name: '',
  category_id: '',
  quantity: '',
  available_quantity: '',
  condition: 'good',
  location: '',
  description: '',
  image_url: '',
  purchase_date: '',
  price: '',
  manager_id: '',
};

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory', 'create');
  const canUpdate = hasPermission('inventory', 'update');
  const canDelete = hasPermission('inventory', 'delete');

  const [items, setItems] = useState<InventoryWithManager[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, catRes, adminRes] = await Promise.all([
      supabase.from('inventory').select('*, admin_users!manager_id(name, email)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
    ]);

    if (invRes.error) {
      showToast('Gagal memuat data inventaris', 'error');
    } else {
      const rows = (invRes.data as unknown as (Inventory & { admin_users: { name: string; email: string } | null })[]) || [];
      setItems(rows.map((r) => ({ ...r, manager: r.admin_users })));
    }
    if (!catRes.error) setCategories((catRes.data as unknown as Category[]) || []);
    if (!adminRes.error) setAdminUsers((adminRes.data as unknown as AdminUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (categoryFilter !== 'all' && it.category_id !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          it.name?.toLowerCase().includes(q) ||
          it.code?.toLowerCase().includes(q) ||
          it.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, categoryFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (it: Inventory) => {
    setEditingId(it.id);
    setForm({
      code: it.code ?? '',
      name: it.name ?? '',
      category_id: it.category_id ?? '',
      quantity: String(it.quantity ?? ''),
      available_quantity: String(it.available_quantity ?? ''),
      condition: it.condition ?? 'good',
      location: it.location ?? '',
      description: it.description ?? '',
      image_url: it.image_url ?? '',
      purchase_date: it.purchase_date ?? '',
      price: it.price != null ? String(it.price) : '',
      manager_id: it.manager_id ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      showToast('Nama dan kode wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      category_id: form.category_id || null,
      quantity: Number(form.quantity) || 0,
      available_quantity: Number(form.available_quantity) || 0,
      condition: form.condition,
      location: form.location,
      description: form.description || null,
      image_url: form.image_url || null,
      purchase_date: form.purchase_date || null,
      price: form.price ? Number(form.price) : null,
      manager_id: form.manager_id || null,
    };

    if (editingId) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
      if (error) showToast('Gagal memperbarui inventaris', 'error');
      else showToast('Inventaris diperbarui', 'success');
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) showToast('Gagal menambah inventaris', 'error');
      else showToast('Inventaris ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus item inventaris ini?')) return;
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) showToast('Gagal menghapus inventaris', 'error');
    else showToast('Inventaris dihapus', 'success');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventaris</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data barang inventaris</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan {filtered.length} dari {items.length} item
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada data inventaris</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Kode</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Nama</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Kategori</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Jumlah</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Kondisi</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Lokasi</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">PJ Barang</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const cfg = conditionConfig[it.condition] || conditionConfig.good;
                  return (
                    <tr key={it.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{it.code}</td>
                      <td className="py-3 px-3 text-slate-900 dark:text-white font-medium">{it.name}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{it.category_id ? (categoryMap[it.category_id] || '-') : '-'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{it.available_quantity}/{it.quantity}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{it.location || '-'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {it.manager?.name || it.manager_name || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(it)}
                              className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(it.id)}
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
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Inventaris' : 'Tambah Inventaris'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kode</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="INV-001" />
                </div>
                <div>
                  <label className="label">Nama Barang</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama barang" />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Pilih kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Penanggung Jawab Barang</label>
                  <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                    <option value="">Pilih PJ Barang</option>
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Jumlah</label>
                  <input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">Jumlah Tersedia</label>
                  <input type="number" className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">Kondisi</label>
                  <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi penyimpanan" />
                </div>
                <div>
                  <label className="label">URL Gambar</label>
                  <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">Tanggal Pembelian</label>
                  <input type="date" className="input" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Harga</label>
                  <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi barang" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-4 h-4" />
                PJ Barang akan ditugaskan untuk item ini.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
