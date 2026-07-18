import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Trash2, Search, ShieldCheck, ShieldOff, Pencil } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAdmins((data ?? []) as unknown as AdminUser[]);
    } catch (e) {
      showToast('Gagal memuat data admin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, level, is_active')
        .eq('is_active', true)
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch (e) {
      showToast('Gagal memuat daftar role', 'error');
    }
  };

  useEffect(() => {
    loadAdmins();
    loadRoles();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      (a.email ?? '').toLowerCase().includes(q) ||
      (a.name ?? '').toLowerCase().includes(q) ||
      (a.role ?? '').toLowerCase().includes(q),
    );
  }, [admins, search]);

  const resetAdd = () => {
    setAddEmail('');
    setAddName('');
    setAddUserId('');
    setAddRoleId('');
  };

  const handleAdd = async () => {
    const email = addEmail.trim();
    const name = addName.trim();
    if (!email) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      let userId: string | null = addUserId.trim() || null;

      if (!userId) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .eq('email', email)
          .maybeSingle();
        const ex = existing as unknown as { id: string; user_id: string | null } | null;
        if (ex) {
          userId = ex.user_id;
          showToast('Email sudah terdaftar sebagai admin. Menambahkan role baru.', 'info');
        }
      }

      const role = roles.find((r) => r.id === addRoleId) ?? null;
      const roleName = role?.name ?? '';

      const { data: inserted, error } = await supabase
        .from('admin_users')
        .insert({
          email,
          name: name ?? '',
          role: roleName,
          user_id: userId,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      const newAdmin = inserted as unknown as { id: string };

      if (role) {
        const { error: linkErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: newAdmin.id, role_id: role.id },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (linkErr) throw linkErr;
      }

      showToast('Admin berhasil ditambahkan', 'success');
      resetAdd();
      setShowAdd(false);
      await loadAdmins();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal menambahkan admin', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (admin: AdminUser) => {
    setEditTarget(admin);
    const match = roles.find((r) => r.name === admin.role);
    setEditRoleId(match?.id ?? '');
  };

  const handleUpdateRole = async () => {
    if (!editTarget) return;
    const role = roles.find((r) => r.id === editRoleId) ?? null;
    if (!role) {
      showToast('Pilih role terlebih dahulu', 'warning');
      return;
    }
    setEditSaving(true);
    try {
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', editTarget.id);
      if (updErr) throw updErr;

      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: editTarget.id, role_id: role.id },
          { onConflict: 'admin_user_id,role_id' },
        );
      if (linkErr) throw linkErr;

      showToast('Role admin berhasil diperbarui', 'success');
      setEditTarget(null);
      setEditRoleId('');
      await loadAdmins();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal memperbarui role', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (admin: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);
      if (error) throw error;
      showToast(admin.is_active ? 'Admin dinonaktifkan' : 'Admin diaktifkan', 'success');
      await loadAdmins();
    } catch (e) {
      showToast('Gagal mengubah status', 'error');
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!confirm(`Hapus admin "${admin.email}"?`)) return;
    try {
      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', admin.id);
      if (linkErr) throw linkErr;

      const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
      if (error) throw error;

      showToast('Admin berhasil dihapus', 'success');
      await loadAdmins();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal menghapus admin', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola akun admin dan role mereka.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Admin
          </button>
        )}
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau role…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {a.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(a)}
                      disabled={!canUpdate}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        a.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                        !canUpdate && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {a.is_active ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                      {a.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <button
                          onClick={() => openEdit(a)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Role
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleRemove(a)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Tambah Admin" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <Field label="Nama">
              <input value={addName} onChange={(e) => setAddName(e.target.value)} className={inputCls} placeholder="Nama lengkap" />
            </Field>
            <Field label="Email">
              <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className={inputCls} placeholder="admin@example.com" />
            </Field>
            <Field label="User ID (opsional)">
              <input value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className={inputCls} placeholder="UUID dari auth.users (opsional)" />
            </Field>
            <Field label="Role">
              <select value={addRoleId} onChange={(e) => setAddRoleId(e.target.value)} className={inputCls}>
                <option value="">— Pilih Role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
            <button onClick={handleAdd} disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit role modal */}
      {editTarget && (
        <Modal title={`Ubah Role — ${editTarget.email ?? ''}`} onClose={() => setEditTarget(null)}>
          <Field label="Role">
            <select value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} className={inputCls}>
              <option value="">— Pilih Role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
              ))}
            </select>
          </Field>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setEditTarget(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
            <button onClick={handleUpdateRole} disabled={editSaving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {editSaving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Small helpers local to this file
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
