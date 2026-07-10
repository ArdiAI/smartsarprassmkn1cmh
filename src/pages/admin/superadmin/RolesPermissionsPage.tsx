import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { Plus, Edit, Trash2, X, Shield, Lock, Check, ChevronRight, AlertCircle, Info } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  is_system: boolean;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  module: string;
  action: string;
  label: string;
  description: string;
}

const MODULE_LABELS: Record<string, string> = {
  users: 'Pengguna',
  roles: 'Role & Permission',
  facilities: 'Fasilitas',
  facility_managers: 'Penanggung Jawab',
  inventory: 'Inventaris',
  borrowings: 'Peminjaman',
  announcements: 'Pengumuman',
  workflows: 'Workflow Approval',
  system_config: 'Konfigurasi Sistem',
  statistics: 'Statistik',
  reports: 'Laporan',
};

const MODULE_COLORS: Record<string, string> = {
  users: 'blue', roles: 'purple', facilities: 'emerald', facility_managers: 'teal',
  inventory: 'amber', borrowings: 'cyan', announcements: 'rose', workflows: 'orange',
  system_config: 'slate', statistics: 'indigo', reports: 'red',
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '', level: 10 });
  const [rolePermIds, setRolePermIds] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [error, setError] = useState('');

  const modules = [...new Set(permissions.map(p => p.module))];

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [rolesRes, permsRes, rpRes] = await Promise.all([
      supabase.from('roles').select('*').order('level', { ascending: false }),
      supabase.from('permissions').select('*').order('module').order('action'),
      supabase.from('role_permissions').select('role_id, permission_id'),
    ]);

    const fetchedRoles = rolesRes.data || [];
    const fetchedPerms = permsRes.data || [];
    const fetchedRPs = rpRes.data || [];

    const rpMap: Record<string, string[]> = {};
    fetchedRPs.forEach((rp: any) => {
      if (!rpMap[rp.role_id]) rpMap[rp.role_id] = [];
      rpMap[rp.role_id].push(rp.permission_id);
    });

    const enrichedRoles = fetchedRoles.map((r: any) => ({
      ...r,
      permissions: fetchedPerms.filter((p: any) => (rpMap[r.id] || []).includes(p.id)),
    }));

    setRoles(enrichedRoles);
    setPermissions(fetchedPerms);
    setLoading(false);

    if (selectedRole) {
      const updated = enrichedRoles.find((r: any) => r.id === selectedRole.id);
      if (updated) {
        setSelectedRole(updated);
        setRolePermIds((updated.permissions || []).map((p: any) => p.id));
      }
    }
  }

  function openCreateRole() {
    setEditingRole(null);
    setRoleFormData({ name: '', description: '', level: 10 });
    setError('');
    setShowRoleModal(true);
  }

  function openEditRole(role: Role) {
    setEditingRole(role);
    setRoleFormData({ name: role.name, description: role.description, level: role.level });
    setError('');
    setShowRoleModal(true);
  }

  function selectRole(role: Role) {
    setSelectedRole(role);
    setRolePermIds((role.permissions || []).map(p => p.id));
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingRole) {
        const { error: err } = await supabase.from('roles')
          .update({ name: roleFormData.name, description: roleFormData.description, level: roleFormData.level })
          .eq('id', editingRole.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase.from('roles')
          .insert({ name: roleFormData.name, description: roleFormData.description, level: roleFormData.level });
        if (err) throw new Error(err.message);
      }
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(id: string) {
    await supabase.from('roles').delete().eq('id', id);
    setDeleteId(null);
    if (selectedRole?.id === id) setSelectedRole(null);
    fetchData();
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSavingPerms(true);
    await supabase.from('role_permissions').delete().eq('role_id', selectedRole.id);
    if (rolePermIds.length > 0) {
      await supabase.from('role_permissions').insert(
        rolePermIds.map(pid => ({ role_id: selectedRole.id, permission_id: pid }))
      );
    }
    setSavingPerms(false);
    fetchData();
  }

  function togglePerm(id: string) {
    setRolePermIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function toggleModule(module: string) {
    const modulePerms = permissions.filter(p => p.module === module).map(p => p.id);
    const allSelected = modulePerms.every(pid => rolePermIds.includes(pid));
    if (allSelected) {
      setRolePermIds(prev => prev.filter(id => !modulePerms.includes(id)));
    } else {
      setRolePermIds(prev => [...new Set([...prev, ...modulePerms])]);
    }
  }

  const getLevelBadge = (level: number) => {
    if (level >= 100) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (level >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (level >= 50) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (level >= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Role & Permission</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola peran dan hak akses sistem</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Daftar Role</h2>
              <button onClick={openCreateRole}
                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : roles.map(role => (
                <button key={role.id} onClick={() => selectRole(role)}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left',
                    selectedRole?.id === role.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent')}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    selectedRole?.id === role.id ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700')}>
                    <Shield className={cn('w-4 h-4', selectedRole?.id === role.id ? 'text-white' : 'text-slate-500')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{role.name}</span>
                      {role.is_system && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">Sistem</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{role.permissions?.length || 0} permission</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getLevelBadge(role.level))}>Lv.{role.level}</span>
                    {!role.is_system && (
                      <button onClick={e => { e.stopPropagation(); setDeleteId(role.id); }}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          {!selectedRole ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center h-64">
              <div className="text-center">
                <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Pilih role untuk mengatur permission</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white">{selectedRole.name}</h2>
                    <p className="text-xs text-slate-500">{selectedRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedRole.is_system && (
                    <button onClick={() => openEditRole(selectedRole)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  <button onClick={savePermissions} disabled={savingPerms}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    <Check className="w-3.5 h-3.5" /> {savingPerms ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
              {selectedRole.level >= 100 && (
                <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  Super Admin memiliki akses penuh ke seluruh sistem secara default.
                </div>
              )}
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {modules.map(module => {
                  const modulePerms = permissions.filter(p => p.module === module);
                  const selectedCount = modulePerms.filter(p => rolePermIds.includes(p.id)).length;
                  const allSelected = selectedCount === modulePerms.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  return (
                    <div key={module} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <button onClick={() => toggleModule(module)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                          allSelected ? 'bg-blue-500 border-blue-500' : someSelected ? 'bg-blue-200 border-blue-400' : 'border-slate-300 dark:border-slate-500'
                        )}>
                          {(allSelected || someSelected) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {MODULE_LABELS[module] || module}
                        </span>
                        <span className="text-xs text-slate-400">{selectedCount}/{modulePerms.length}</span>
                      </button>
                      <div className="grid grid-cols-2 gap-1.5 p-3">
                        {modulePerms.map(perm => (
                          <label key={perm.id} className={cn(
                            'flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all',
                            rolePermIds.includes(perm.id)
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/10'
                              : 'border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                          )}>
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              rolePermIds.includes(perm.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-500'
                            )}>
                              {rolePermIds.includes(perm.id) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={rolePermIds.includes(perm.id)}
                              onChange={() => togglePerm(perm.id)} />
                            <div>
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{perm.label}</div>
                              <div className="text-xs text-slate-400 capitalize">{perm.action}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Create/Edit Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingRole ? 'Edit Role' : 'Buat Role Baru'}
                </h2>
                <button onClick={() => setShowRoleModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveRole} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Role</label>
                  <input value={roleFormData.name} onChange={e => setRoleFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Koordinator Sarana" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                  <textarea value={roleFormData.description} onChange={e => setRoleFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Deskripsi singkat tentang role ini..." rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Level Akses <span className="text-slate-400 font-normal">(1–99, Super Admin = 100)</span>
                  </label>
                  <input type="number" min={1} max={99} value={roleFormData.level}
                    onChange={e => setRoleFormData(p => ({ ...p, level: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowRoleModal(false)}
                    className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium">Batal</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Role Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Hapus Role?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Semua penugasan role ini ke pengguna akan ikut dihapus.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                <button onClick={() => handleDeleteRole(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
