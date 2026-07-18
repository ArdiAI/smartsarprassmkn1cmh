import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Package,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

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

interface InventoryForm {
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

const emptyForm: InventoryForm = {
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

const conditionStyles: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const conditionLabel: Record<string, string> = {
  good: 'Baik',
  fair: 'Layak',
  poor: 'Rusak',
};

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managers, setManagers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canCreate = hasPermission('inventory', 'create');
  const canUpdate = hasPermission('inventory', 'update');
  const canDelete = hasPermission('inventory', 'delete');

  async function fetchData() {
    setLoading(true);
    try {
      const [invRes, catRes, mgrRes] = await Promise.all([
        supabase.from('inventory').select('*, categories!category_id(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
      ]);
      if (invRes.error) {
        showToast('Gagal memuat inventaris', 'error');
        return;
      }
      setItems((invRes.data as unknown as Inventory[]) ?? []);
      setCategories((catRes.data as unknown as Category[]) ?? []);
      setManagers((mgrRes.data as unknown as AdminUser[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        (it.code ?? '').toLowerCase().includes(q) ||
        (it.location ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const managerMap = useMemo(() => {
    const m: Record<string, string> = {};
    managers.forEach((mgr) => {
      m[mgr.id] = mgr.name;
    });
    return m;
  }, [managers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(it: Inventory) {
    setEditing(it);
    setForm({
      name: it.name ?? '',
      code: it.code ?? '',
      description: it.description ?? '',
      category_id: it.category_id ?? '',
      quantity: String(it.quantity ?? 0),
      available_quantity: String(it.available_quantity ?? 0),
      condition: it.condition ?? 'good',
      location: it.location ?? '',
      manager_id: it.manager_id ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama barang wajib diisi', 'warning');
    if (!form.quantity || parseInt(form.quantity, 10) < 0) return showToast('Jumlah tidak valid', 'warning');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        quantity: parseInt(form.quantity, 10),
        available_quantity: parseInt(form.available_quantity, 10) || parseInt(form.quantity, 10),
        condition: form.condition,
        location: form.location.trim() || null,
        manager_id: form.manager_id || null,
      };
      if (editing) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui barang', 'error');
          return;
        }
        showToast('Barang diperbarui', 'success');
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) {
          showToast('Gagal menambah barang', 'error');
          return;
        }
        showToast('Barang ditambahkan', 'success');
      }
      closeModal();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(it: Inventory) {
    if (!confirm(`Hapus "${it.name}"?`)) return;
    setDeleting(it.id);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', it.id);
      if (error) {
        showToast('Gagal menghapus barang', 'error');
        return;
      }
      showToast('Barang dihapus', 'success');
      fetchData();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inventaris</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola data barang inventaris sekolah.</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Barang
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama, kode, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada inventaris" description="Belum ada data barang inventaris." icon={<Package className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Jumlah</th>
                <th className="px-4 py-3 font-semibold">Tersedia</th>
                <th className="px-4 py-3 font-semibold">Kondisi</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">PJ Barang</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{it.code ?? '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{it.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.categories?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.quantity}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.available_quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conditionStyles[it.condition] ?? conditionStyles.good}`}>
                      {conditionLabel[it.condition] ?? it.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.location ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {it.manager_id ? (managerMap[it.manager_id] ?? it.manager_name ?? '-') : (it.manager_name ?? '-')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <button onClick={() => openEdit(it)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(it)}
                          disabled={deleting === it.id}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          {deleting === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kode</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
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
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah <span className="text-red-500">*</span></label>
                  <input type="number" min={0} className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Tersedia</label>
                  <input type="number" min={0} className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kondisi</label>
                  <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    <option value="good">Baik</option>
                    <option value="fair">Layak</option>
                    <option value="poor">Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Penanggung Jawab Barang</label>
                <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                  <option value="">Pilih PJ Barang</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
