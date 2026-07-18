import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import {
  Shield, Plus, Pencil, Trash2, Loader2, Save, X, Lock, Check, ChevronDown,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  label: string;
  description: string;
}

interface RolePermissionRow {
  role_id: string;
  permission_id: string;
}

const moduleLabels: Record<string, string> = {
  borrowings: 'Peminjaman',
  inventory: 'Inventaris',
  facilities: 'Fasilitas',
  reports: 'Laporan Kerusakan',
  statistics: 'Statistik',
  team: 'Tim',
  announcements: 'Pengumuman',
  aspirasi: 'Aspirasi',
  users: 'Manajemen User',
  roles: 'Roles & Permissions',
  facility_managers: 'PJ Fasilitas',
  workflows: 'Approval Workflow',
  approver_emails: 'Email Approver',
  system_config: 'Konfigurasi Sistem',
};

const actionLabels: Record<string, string> = {
  read: 'Lihat',
  create: 'Tambah',
  update: 'Edit',
  delete: 'Hapus',
  approve: 'Setujui',
  reject: 'Tolak',
  manage: 'Kelola',
};

const actionColors: Record<string, string> = {
  read: 'text-blue-600 dark:text-blue-400',
  create: 'text-emerald-600 dark:text-emerald-400',
  update: 'text-amber-600 dark:text-amber-400',
  delete: 'text-red-600 dark:text-red-400',
  approve: 'text-emerald-600 dark:text-emerald-400',
  reject: 'text-red-600 dark:text-red-400',
  manage: 'text-purple-600 dark:text-purple-400',
};

export default function RolesPermissionsPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', level: 50 });
  const [dirty, setDirty] = useState(false);

  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: rolesData }, { data: permsData }] = await Promise.all([
      supabase.from('roles').select('*').order('level', { ascending: false }),
      supabase.from('permissions').select('*').order('module, action'),
    ]);
    setRoles((rolesData as unknown as Role[]) || []);
    setAllPermissions((permsData as unknown as Permission[]) || []);
    if ((rolesData as unknown as Role[])?.length > 0 && !selectedRoleId) {
      setSelectedRoleId((rolesData as unknown as Role[])[0].id);
    }
    setLoading(false);
  }, [selectedRoleId]);

  const fetchRolePermissions = useCallback(async (roleId: string) => {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);
    const ids = new Set(((data as unknown as RolePermissionRow[]) || []).map(r => r.permission_id));
    setRolePermissions(ids);
    setDirty(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedRoleId) fetchRolePermissions(selectedRoleId);
  }, [selectedRoleId, fetchRolePermissions]);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || null;

  const groupedPermissions = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const togglePermission = (permissionId: string) => {
    setRolePermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
    setDirty(true);
  };

  const toggleModule = (module: string, modulePerms: Permission[]) => {
    const allChecked = modulePerms.every(p => rolePermissions.has(p.id));
    setRolePermissions(prev => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allChecked) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
    setDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const { data: current } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', selectedRoleId);
      const currentIds = new Set(((current as unknown as RolePermissionRow[]) || []).map(r => r.permission_id));

      const toAdd: { role_id: string; permission_id: string }[] = [];
      for (const pid of rolePermissions) {
        if (!currentIds.has(pid)) toAdd.push({ role_id: selectedRoleId, permission_id: pid });
      }
      const toRemove: string[] = [];
      for (const pid of currentIds) {
        if (!rolePermissions.has(pid)) toRemove.push(pid);
      }

      if (toAdd.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(toAdd);
        if (error) throw error;
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRoleId)
          .in('permission_id', toRemove);
        if (error) throw error;
      }

      setDirty(false);
      showToast(`Permission untuk role "${selectedRole?.name}" berhasil disimpan`, 'success');
      await refreshAdminProfile();
    } catch (e: any) {
      showToast(`Gagal menyimpan: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', level: 50 });
    setShowRoleModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '', level: role.level });
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      showToast('Nama role wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update({ name: roleForm.name, description: roleForm.description, level: roleForm.level })
          .eq('id', editingRole.id);
        if (error) throw error;
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('roles')
          .insert({ name: roleForm.name, description: roleForm.description, level: roleForm.level, is_active: true, is_system: false });
        if (error) throw error;
        showToast('Role berhasil dibuat', 'success');
      }
      setShowRoleModal(false);
      await fetchData();
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'error');
      return;
    }
    if (!confirm(`Hapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      showToast('Role berhasil dihapus', 'success');
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      await fetchData();
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola permission setiap role — centang dan simpan, perubahan otomatis berlaku saat user login berikutnya
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Role
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {roles.map(role => {
            const isSelected = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className="font-medium text-slate-900 dark:text-white truncate">{role.name}</span>
                    {role.is_system && <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">Lv.{role.level}</span>
                </div>
                {role.description && (
                  <p className="text-xs text-slate-500 mt-1 truncate">{role.description}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    {selectedRole.name}
                    {selectedRole.is_system && <Lock className="w-4 h-4 text-slate-400" />}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Level {selectedRole.level} · {rolePermissions.size} permission aktif
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <button
                      onClick={() => openEditModal(selectedRole)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" /> Edit Role
                    </button>
                  )}
                  {canDelete && !selectedRole.is_system && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Centang permission yang ingin diberikan ke role ini. Klik <strong>Simpan</strong> untuk menerapkan.
                </p>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {Object.entries(groupedPermissions).map(([module, perms]) => {
                    const allChecked = perms.every(p => rolePermissions.has(p.id));
                    const someChecked = perms.some(p => rolePermissions.has(p.id));
                    return (
                      <div key={module} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-700/30">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                              onChange={() => toggleModule(module, perms)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                              {moduleLabels[module] || module}
                            </span>
                          </label>
                          <span className="text-xs text-slate-400">
                            {perms.filter(p => rolePermissions.has(p.id)).length}/{perms.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-3">
                          {perms.map(p => {
                            const checked = rolePermissions.has(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                  checked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(p.id)}
                                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    <span className={actionColors[p.action] || ''}>{actionLabels[p.action] || p.action}</span>
                                    {' — '}
                                    {p.label}
                                  </p>
                                  <p className="text-xs text-slate-400">{p.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {canUpdate && (
                  <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {dirty && (
                      <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Perubahan belum disimpan
                      </span>
                    )}
                    <button
                      onClick={handleSavePermissions}
                      disabled={!dirty || saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Permission
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Pilih role di kiri untuk mengelola permission</p>
            </div>
          )}
        </div>
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowRoleModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingRole ? 'Edit Role' : 'Tambah Role'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Role</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="mis. Koordinator Sarpras"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={roleForm.description}
                  onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                  rows={2}
                  placeholder="Deskripsi singkat role"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Level (10-100, semakin tinggi semakin berwenang)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={roleForm.level}
                  onChange={e => setRoleForm({ ...roleForm, level: parseInt(e.target.value) || 50 })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowRoleModal(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSaveRole}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingRole ? 'Simpan' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
