import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  Package,
  MapPin,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import { cn } from '../../utils/cn';

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
  categories?: { name: string } | null;
}

const CONDITION_STYLES: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Rusak',
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
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [inv, cat, admins] = await Promise.all([
      supabase
        .from('inventory')
        .select('*, categories!category_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
    ]);
    setItems((inv.data as unknown as Inventory[]) ?? []);
    setCategories((cat.data as unknown as Category[]) ?? []);
    setAdminUsers((admins.data as unknown as AdminUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const adminUserMap = useMemo(() => {
    const map: Record<string, AdminUser> = {};
    adminUsers.forEach((a) => { map[a.id] = a; });
    return map;
  }, [adminUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama barang wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      available_quantity: form.available_quantity ? Number(form.available_quantity) : null,
      condition: form.condition,
      location: form.location.trim() || null,
      manager_id: form.manager_id || null,
    };
    const { error } = editing
      ? await supabase.from('inventory').update(payload).eq('id', editing.id)
      : await supabase.from('inventory').insert(payload);
    setSaving(false);
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Barang diperbarui' : 'Barang ditambahkan', 'success');
    setModalOpen(false);
    await fetchAll();
  };

  const handleDelete = async (item: Inventory) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Barang dihapus', 'info');
    await fetchAll();
  };

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inventaris</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar barang dan penanggung jawab.
          </p>
        </div>
        {hasPermission('inventory', 'create') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Barang
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama atau kode barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada barang" description="Belum ada data inventaris." />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left dark:border-slate-800">
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Kode</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Nama</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Kategori</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Jumlah</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Kondisi</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">Lokasi</th>
                <th className="pb-3 pr-4 font-medium text-slate-500 dark:text-slate-400">PJ Barang</th>
                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const pj = item.manager_id ? adminUserMap[item.manager_id] : null;
                const pjName = pj?.name ?? item.manager_name ?? null;
                return (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {item.code ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {item.categories?.name ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {item.available_quantity ?? '-'}/{item.quantity ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        CONDITION_STYLES[item.condition ?? 'good'] ?? CONDITION_STYLES.good,
                      )}>
                        {CONDITION_LABELS[item.condition ?? 'good'] ?? item.condition}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {item.location ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {pjName ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {pjName}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
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
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama Barang <span className="text-red-500">*</span></label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kode</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Pilih Kategori</option>
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
                <div>
                  <label className="label">Jumlah</label>
                  <input type="number" min={0} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Jumlah Tersedia</label>
                  <input type="number" min={0} className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mis. Gudang A / Ruang Lab" />
                </div>
                {/* PJ Barang dropdown */}
                <div className="sm:col-span-2">
                  <label className="label">Penanggung Jawab Barang</label>
                  <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                    <option value="">Pilih PJ Barang</option>
                    {adminUsers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email}) — {a.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
