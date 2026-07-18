import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  Package,
  MapPin,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InventoryItem {
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
  available_quantity: number;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  created_at: string;
  categories: { name: string } | null;
  manager?: { name: string; email: string } | null;
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

interface FormState {
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

const emptyForm: FormState = {
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, catRes, adminRes] = await Promise.all([
      supabase.from('inventory').select('*, categories!category_id(name), admin_users!manager_id(name, email)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, description').order('name'),
      supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
    ]);
    setItems((invRes.data as unknown as InventoryItem[]) ?? []);
    setCategories((catRes.data as unknown as Category[]) ?? []);
    setAdminUsers((adminRes.data as unknown as AdminUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build manager lookup
  const managerLookup = useMemo(() => {
    const map: Record<string, string> = {};
    adminUsers.forEach((u) => { map[u.id] = u.name; });
    return map;
  }, [adminUsers]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        it.name?.toLowerCase().includes(q) ||
        it.code?.toLowerCase().includes(q) ||
        it.location?.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: InventoryItem) {
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
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Nama dan kode wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
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
    if (editing) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Inventaris diperbarui', 'success');
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) {
        showToast('Gagal menambah: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Inventaris ditambahkan', 'success');
    }
    setSubmitting(false);
    closeModal();
    fetchData();
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    setDeleting(item.id);
    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
    setDeleting(null);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Inventaris dihapus', 'success');
    fetchData();
  }

  function getManagerName(item: InventoryItem): string {
    if (item.manager?.name) return item.manager.name;
    if (item.manager_id && managerLookup[item.manager_id]) return managerLookup[item.manager_id];
    if (item.manager_name) return item.manager_name;
    return '—';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inventaris</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data barang dan sarana sekolah.
          </p>
        </div>
        {hasPermission('inventory', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Barang
          </button>
        )}
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Cari nama, kode, lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-slate-400" />}
          title="Tidak ada inventaris"
          description="Belum ada barang yang terdaftar."
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Kode</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nama</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Kategori</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Qty</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Kondisi</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Lokasi</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">PJ Barang</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{it.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{it.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.categories?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {it.available_quantity}/{it.quantity}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', CONDITION_STYLES[it.condition] ?? CONDITION_STYLES.good)}>
                      {CONDITION_LABELS[it.condition] ?? it.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.location ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{getManagerName(it)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('inventory', 'update') && (
                        <button
                          onClick={() => openEdit(it)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('inventory', 'delete') && (
                        <button
                          onClick={() => handleDelete(it)}
                          disabled={deleting === it.id}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          {deleting === it.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Kode <span className="text-red-500">*</span></label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah</label>
                  <input type="number" min={0} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Jumlah Tersedia</label>
                  <input type="number" min={0} className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} />
                </div>
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
                <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
