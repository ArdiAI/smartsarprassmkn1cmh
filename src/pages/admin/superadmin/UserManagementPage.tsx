import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { Search, UserPlus, Trash2, ToggleLeft, ToggleRight, Shield, Loader2 } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: adminData }, { data: roleData }] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('level', { ascending: true }),
    ]);
    setAdmins((adminData as unknown as AdminUser[]) || []);
    setRoles((roleData as unknown as Role[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) { showToast('Email wajib diisi', 'error'); return; }
    setAdding(true);
    const { data: existing } = await supabase.from('admin_users').select('id').eq('email', newEmail.trim()).single();
    if (existing) { showToast('Admin dengan email ini sudah ada', 'error'); setAdding(false); return; }
    const { error } = await supabase.from('admin_users').insert({
      email: newEmail.trim(),
      name: newName.trim() || null,
      role: newRole || 'admin',
      is_active: true,
    });
    if (error) { showToast('Gagal menambah admin: ' + error.message, 'error'); }
    else {
      showToast('Admin berhasil ditambahkan', 'success');
      setShowAdd(false); setNewEmail(''); setNewName(''); setNewRole('');
      fetchData();
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus admin ini?')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); }
    else { showToast('Admin dihapus', 'success'); fetchData(); }
  };

  const handleToggle = async (admin: AdminUser) => {
    const { error } = await supabase.from('admin_users').update({ is_active: !admin.is_active }).eq('id', admin.id);
    if (error) { showToast('Gagal mengubah status', 'error'); }
    else { showToast('Status diperbarui', 'success'); fetchData(); }
  };

  const handleRoleChange = async (admin: AdminUser, role: string) => {
    const { error } = await supabase.from('admin_users').update({ role }).eq('id', admin.id);
    if (error) { showToast('Gagal mengubah role', 'error'); }
    else { showToast('Role diperbarui', 'success'); fetchData(); }
  };

  const filtered = admins.filter(a =>
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.role ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola admin dan role pengguna</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          <UserPlus className="w-4 h-4" /> Tambah Admin
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari admin..." className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Tidak ada admin ditemukan</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(admin => (
            <div key={admin.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{admin.name || admin.email}</p>
                <p className="text-sm text-slate-500 truncate">{admin.email}</p>
              </div>
              <select value={admin.role ?? 'admin'} onChange={e => handleRoleChange(admin, e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <button onClick={() => handleToggle(admin)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                {admin.is_active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
              </button>
              <button onClick={() => handleRemove(admin.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tambah Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="admin@example.com" className="input" />
              </div>
              <div>
                <label className="label">Nama</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama lengkap" className="input" />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="input">
                  <option value="">Pilih role...</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                  {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleAdd} disabled={adding} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
