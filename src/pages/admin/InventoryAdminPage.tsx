import { useEffect, useState, useCallback, type FormEvent } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, X, Package, MapPin, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
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

interface Inventory {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  quantity: number | null;
  available_quantity: number | null;
  condition: string | null;
  location: string | null;
  image_url: string | null;
  purchase_date: string | null;
  price: number | null;
  description: string | null;
  manager_name: string | null;
  manager_role: string | null;
  manager_id: string | null;
  created_at: string;
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

const conditionBadge = (c: string | null) => {
  switch (c) {
    case 'good': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'fair': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'poor': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const conditionLabel = (c: string | null) => {
  switch (c) {
    case 'good': return 'Baik';
    case 'fair': return 'Cukup';
    case 'poor': return 'Rusak';
    default: return '-';
  }
};

export default function InventoryAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminMap, setAdminMap] = useState<Record<string, AdminUser>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [invRes, catRes, admRes] = await Promise.all([
      supabase.from('inventory').select('*, categories!category_id(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, description').order('name'),
      supabase.from('admin_users').select('id, name, email, role').eq('is_active', true).order('name'),
    ]);
    if (invRes.error) {
      showToast('Gagal memuat inventaris', 'error');
    } else {
      setItems((invRes.data ?? []) as unknown as Inventory[]);
    }
    setCategories((catRes.data ?? []) as unknown as Category[]);
    const admData = (admRes.data ?? []) as unknown as AdminUser[];
    setAdmins(admData);
    const map: Record<string, AdminUser> = {};
    admData.forEach((a) => { map[a.id] = a; });
    setAdminMap(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      quantity: item.quantity?.toString() ?? '',
      available_quantity: item.available_quantity?.toString() ?? '',
      condition: item.condition ?? 'good',
      location: item.location ?? '',
      manager_id: item.manager_id ?? '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (item: Inventory) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const { error } = await supabase.from('inventory').delete().eq('id', item.id);
    if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); return; }
    showToast('Inventaris dihapus', 'success');
    fetchAll();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama wajib diisi', 'error');
    if (!form.code.trim()) return showToast('Kode wajib diisi', 'error');

    const qty = form.quantity ? parseInt(form.quantity, 10) : null;
    const avail = form.available_quantity ? parseInt(form.available_quantity, 10) : null;

    const selectedAdmin = form.manager_id ? adminMap[form.manager_id] : null;
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      quantity: qty,
      available_quantity: avail,
      condition: form.condition,
      location: form.location.trim() || null,
      manager_id: form.manager_id || null,
      manager_name: selectedAdmin ? selectedAdmin.name : null,
      manager_role: selectedAdmin ? selectedAdmin.role : null,
    };

    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editing.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Inventaris diperbarui', 'success');
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) { showToast('Gagal menambah: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Inventaris ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const filtered = items.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.code?.toLowerCase().includes(q) ?? false) || (i.location?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola Inventaris</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daftar barang sarana dan prasarana sekolah.</p>
        </div>
        {hasPermission('inventory', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Tambah Barang
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cari nama, kode, atau lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada inventaris" description="Belum ada barang yang ditambahkan." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-3 pr-4 font-semibold">Kode</th>
                <th className="pb-3 pr-4 font-semibold">Nama</th>
                <th className="pb-3 pr-4 font-semibold">Kategori</th>
                <th className="pb-3 pr-4 font-semibold">Qty</th>
                <th className="pb-3 pr-4 font-semibold">Tersedia</th>
                <th className="pb-3 pr-4 font-semibold">Kondisi</th>
                <th className="pb-3 pr-4 font-semibold">Lokasi</th>
                <th className="pb-3 pr-4 font-semibold">PJ Barang</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const pj = item.manager_id ? adminMap[item.manager_id] : null;
                return (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600 dark:text-slate-400">{item.code ?? '-'}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{item.categories?.name ?? '-'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{item.quantity ?? '-'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{item.available_quantity ?? '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${conditionBadge(item.condition)}`}>
                        {conditionLabel(item.condition)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{item.location ?? '-'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                      {pj ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{pj.name}</span>
                        </div>
                      ) : (item.manager_name ?? '-')}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {hasPermission('inventory', 'update') && (
                          <button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('inventory', 'delete') && (
                          <button onClick={() => handleDelete(item)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Barang' : 'Tambah Barang'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama <span className="text-red-500">*</span></label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kode <span className="text-red-500">*</span></label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Pilih kategori</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <label className="label">Tersedia</label>
                  <input type="number" min={0} className="input" value={form.available_quantity} onChange={(e) => setForm({ ...form, available_quantity: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Penanggung Jawab Barang</label>
                  <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                    <option value="">Pilih PJ Barang</option>
                    {admins.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
