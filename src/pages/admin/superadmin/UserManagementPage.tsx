import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users, Search, Plus, Trash2, Pencil, Shield, ShieldCheck, ShieldOff,
  Loader2, X, Mail, User as UserIcon, KeyRound, RefreshCw,
} from 'lucide-react';

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
  level: number | null;
  is_system: boolean;
  is_active: boolean;
}

interface FormState {
  email: string;
  name: string;
  role: string;
  user_id: string;
}

const emptyForm: FormState = { email: '', name: '', role: '', user_id: '' };

export default function UserManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from('roles')
      .select('id, name, level, is_system, is_active')
      .order('level', { ascending: true, nullsFirst: false });
    if (data) setRoles(data as unknown as Role[]);
  }, []);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
      setLoading(false);
      return;
    }
    setAdmins((data as unknown as AdminUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchRoles();
  }, [fetchAdmins, fetchRoles]);

  // Try to find an existing user_id by email (e.g. a row that was auto-created
  // when the user signed up via /auth). This lets the Super Admin link a new
  // admin_users row to the correct auth.users UUID without dashboard access.
  const lookupUserIdByEmail = async (email: string): Promise<string | null> => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .ilike('email', email.trim())
      .not('user_id', 'is', null)
      .limit(1);
    const row = (data as unknown as Pick<AdminUser, 'user_id'>[] | null)?.[0];
    return row?.user_id ?? null;
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: AdminUser) => {
    setEditing(a);
    setForm({
      email: a.email ?? '',
      name: a.name ?? '',
      role: a.role ?? '',
      user_id: a.user_id ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.name.trim() || !form.role.trim()) {
      showToast('Email, nama, dan role wajib diisi', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('admin_users')
          .update({
            email: form.email.trim(),
            name: form.name.trim(),
            role: form.role,
            user_id: form.user_id.trim() || null,
          })
          .eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui admin: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Admin berhasil diperbarui', 'success');
      } else {
        // Try to resolve user_id automatically from an existing row with the
        // same email (e.g. created on signUp). Fall back to the manually pasted
        // UUID, or null if neither is available.
        let resolvedUserId = form.user_id.trim() || null;
        if (!resolvedUserId) {
          const found = await lookupUserIdByEmail(form.email);
          if (found) resolvedUserId = found;
        }

        const { error } = await supabase.from('admin_users').insert({
          user_id: resolvedUserId,
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role,
          is_active: true,
        });
        if (error) {
          showToast('Gagal menambahkan admin: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast(
          resolvedUserId
            ? 'Admin berhasil ditambahkan & terhubung ke akun auth'
            : 'Admin ditambahkan. user_id kosong — minta user login sekali agar terhubung otomatis.',
          resolvedUserId ? 'success' : 'info',
        );
      }
      closeModal();
      await fetchAdmins();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (a: AdminUser) => {
    setActionLoading(a.id);
    const next = !a.is_active;
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: next })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status admin', 'error');
      setActionLoading(null);
      return;
    }
    showToast(`Admin ${next ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    await fetchAdmins();
    setActionLoading(null);
  };

  const handleDelete = async (a: AdminUser) => {
    if (!confirm(`Hapus admin "${a.name}"? Tindakan ini tidak membatalkan akun auth-nya.`)) return;
    setActionLoading(a.id);
    const { error } = await supabase.from('admin_users').delete().eq('id', a.id);
    if (error) {
      showToast('Gagal menghapus admin', 'error');
      setActionLoading(null);
      return;
    }
    showToast('Admin berhasil dihapus', 'success');
    await fetchAdmins();
    setActionLoading(null);
  };

  const filtered = admins.filter(a => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q)
    );
  });

  const roleBadgeColor = (role: string) => {
    if (role === 'superadmin') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (role === 'admin') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-cyan-600" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun admin dan rolenya dalam sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Tambah Admin
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau role..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Admin" value={admins.length} icon={Users} color="cyan" />
        <StatCard label="Admin Aktif" value={admins.filter(a => a.is_active).length} icon={ShieldCheck} color="emerald" />
        <StatCard label="Admin Nonaktif" value={admins.filter(a => !a.is_active).length} icon={ShieldOff} color="amber" />
        <StatCard label="Terhubung Auth" value={admins.filter(a => !!a.user_id).length} icon={KeyRound} color="blue" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada admin ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => (
            <div
              key={a.id}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{a.name || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {a.email || '-'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                  a.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
                )}>
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Role</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', roleBadgeColor(a.role))}>
                    {a.role || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> User ID
                  </span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                    {a.user_id || '— belum terhubung —'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Dibuat</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    }) : '-'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(a)}
                  disabled={actionLoading === a.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    a.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={actionLoading === a.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-600" />
                {editing ? 'Edit Admin' : 'Tambah Admin Baru'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Nama Lengkap" icon={<UserIcon className="w-4 h-4" />}>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap admin"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </Field>

              <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@sekolah.sch.id"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </Field>

              <Field label="Role" icon={<Shield className="w-4 h-4" />}>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.filter(r => r.is_active).map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name}{r.is_system ? ' (sistem)' : ''}{r.level != null ? ` · L${r.level}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="User ID (UUID Auth)" icon={<KeyRound className="w-4 h-4" />}>
                <input
                  type="text"
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  placeholder="Paste UUID dari Supabase dashboard (opsional)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-xs"
                />
              </Field>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                Opsional. Jika dikosongkan, sistem akan mencoba mencocokkan email dengan akun yang sudah terdaftar.
                Jika tidak ditemukan, biarkan kosong — user_id akan terhubung otomatis saat user login.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: 'cyan' | 'emerald' | 'amber' | 'blue' }) {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
