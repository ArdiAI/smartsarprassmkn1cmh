import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Package,
  X,
  MapPin,
  User,
  Tag,
} from 'lucide-react';

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

interface Inventory {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  quantity: number;
  condition: string;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  created_at: string;
  available_quantity: number;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  categories: { name: string } | null;
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

const conditionBadge = (cond: string) => {
  switch (cond) {
    case 'good':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'fair':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'poor':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const conditionLabel = (cond: string) => {
  switch (cond) {
    case 'good': return 'Baik';
    case 'fair': return 'Cukup';
    case 'poor': return 'Rusak';
    default: return cond;
  }
};

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: invData, error }, { data: catData }, { data: admData }] = await Promise.all([
        supabase.from('inventory').select('*, categories!category_id(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
      ]);
      if (error) {
        showToast('Gagal memuat inventaris', 'error');
        return;
      }
      setItems((invData as unknown as Inventory[]) ?? []);
      setCategories((catData as unknown as Category[]) ?? []);
      setAdminUsers((admData as unknown as AdminUser[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (item: Inventory) => {
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
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Nama dan kode wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        quantity: parseInt(form.quantity, 10) || 0,
        available_quantity: parseInt(form.available_quantity, 10) || 0,
        condition: form.condition,
        location: form.location.trim() || null,
        manager_id: form.manager_id || null,
      };
      if (editingId) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Inventaris diperbarui', 'success');
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
        showToast('Inventaris ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAll();
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + (err?.message ?? 'error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      showToast('Inventaris dihapus', 'success');
      await fetchAll();
    } catch {
      showToast('Gagal menghapus inventaris', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.name ?? '').toLowerCase().includes(q) ||
      (item.code ?? '').toLowerCase().includes(q) ||
      (item.location ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inventaris</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola daftar barang sarana</p>
        </div>
        {hasPermission('inventory', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama, kode, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada inventaris" description="Belum ada data barang." icon={<Package className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="pb-3 pr-4">Kode</th>
                <th className="pb-3 pr-4">Nama</th>
                <th className="pb-3 pr-4">Kategori</th>
                <th className="pb-3 pr-4">Jumlah</th>
                <th className="pb-3 pr-4">Tersedia</th>
                <th className="pb-3 pr-4">Kondisi</th>
                <th className="pb-3 pr-4">Lokasi</th>
                <th className="pb-3 pr-4">PJ Barang</th>
                <th className="pb-3 pr-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600 dark:text-slate-300">{item.code ?? '-'}</td>
                  <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">{item.name ?? '-'}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{item.categories?.name ?? '-'}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{item.quantity ?? 0}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{item.available_quantity ?? 0}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${conditionBadge(item.condition ?? '')}`}>
                      {conditionLabel(item.condition ?? '')}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{item.location ?? '-'}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{item.manager_name ?? '-'}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission('inventory', 'update') && (
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('inventory', 'delete') && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                        >
                          {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Inventaris' : 'Tambah Inventaris'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama barang" />
              </div>
              <div>
                <label className="label">Kode <span className="text-red-500">*</span></label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Kode barang" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi (opsional)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="label">Kondisi</label>
                  <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah</label>
                  <input type="number" min={0} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">Tersedia</label>
                  <input type="number" min={0} className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi penyimpanan" />
              </div>
              <div>
                <label className="label">Penanggung Jawab Barang</label>
                <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                  <option value="">Pilih PJ Barang</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Simpan' : 'Tambah'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
