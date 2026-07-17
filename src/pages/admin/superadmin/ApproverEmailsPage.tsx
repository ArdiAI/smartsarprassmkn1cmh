import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Mail,
  MailCheck,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  Pencil,
  Info,
  Shield,
} from 'lucide-react';

// ---- Types ----

interface Role {
  id: string;
  name: string;
  level: number;
}

interface RoleApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
  created_at: string;
}

// ---- Component ----

export default function ApproverEmailsPage() {
  const [mappings, setMappings] = useState<RoleApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form state
  const [addRoleId, setAddRoleId] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [savingInline, setSavingInline] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mappingsRes, rolesRes] = await Promise.all([
        supabase
          .from('role_approver_emails')
          .select('*')
          .order('role_name', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').order('level', { ascending: true }),
      ]);

      if (mappingsRes.error) throw mappingsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setMappings((mappingsRes.data || []) as unknown as RoleApproverEmail[]);
      setRoles((rolesRes.data || []) as unknown as Role[]);
    } catch (err) {
      console.error('Error fetching approver emails:', err);
      showToast('Gagal memuat data email approver', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!addRoleId || !addEmail.trim()) {
      showToast('Role dan email wajib diisi', 'warning');
      return;
    }
    setAdding(true);
    try {
      const role = roles.find(r => r.id === addRoleId);
      if (!role) {
        showToast('Role tidak valid', 'error');
        return;
      }

      const { error } = await supabase
        .from('role_approver_emails')
        .insert({
          role_id: addRoleId,
          role_name: role.name,
          approver_email: addEmail.trim().toLowerCase(),
          approver_name: addName.trim(),
          is_active: true,
        });

      if (error) throw error;

      showToast('Mapping email approver berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setAddRoleId('');
      setAddEmail('');
      setAddName('');
      fetchData();
    } catch (err) {
      console.error('Error adding approver email:', err);
      showToast('Gagal menambahkan mapping', 'error');
    } finally {
      setAdding(false);
    }
  };

  const startInlineEdit = (mapping: RoleApproverEmail) => {
    setEditingId(mapping.id);
    setEditEmail(mapping.approver_email);
    setEditName(mapping.approver_name);
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditEmail('');
    setEditName('');
  };

  const saveInlineEdit = async (mapping: RoleApproverEmail) => {
    if (!editEmail.trim()) {
      showToast('Email tidak boleh kosong', 'warning');
      return;
    }
    setSavingInline(true);
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .update({
          approver_email: editEmail.trim().toLowerCase(),
          approver_name: editName.trim(),
        })
        .eq('id', mapping.id);

      if (error) throw error;

      showToast('Email approver berhasil diperbarui', 'success');
      setEditingId(null);
      setEditEmail('');
      setEditName('');
      fetchData();
    } catch (err) {
      console.error('Error updating approver email:', err);
      showToast('Gagal memperbarui email', 'error');
    } finally {
      setSavingInline(false);
    }
  };

  const handleDelete = async (mapping: RoleApproverEmail) => {
    if (!confirm(`Hapus mapping email untuk role "${mapping.role_name}"?`)) return;
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .delete()
        .eq('id', mapping.id);
      if (error) throw error;
      showToast('Mapping berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting mapping:', err);
      showToast('Gagal menghapus mapping', 'error');
    }
  };

  const getRoleBadgeColor = (level: number | undefined) => {
    if (level === undefined) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (level >= 90) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (level >= 70) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    if (level >= 40) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  const getRoleLevel = (roleName: string) => roles.find(r => r.name === roleName)?.level;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MailCheck className="w-6 h-6 text-blue-500" />
            Email Approver
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Petakan role ke email approver untuk notifikasi
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={roles.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Tambah Mapping
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Routing Notifikasi Email</p>
          <p className="mt-0.5">
            Mapping ini menentukan kemana email notifikasi persetujuan dikirim. Saat sebuah langkah workflow
            membutuhkan persetujuan dari role tertentu, sistem akan mengirim notifikasi ke semua email yang
            terdaftar untuk role tersebut. Gunakan ini untuk approver yang tidak memiliki akun login tetapi
            perlu menerima notifikasi.
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : mappings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada mapping email approver</p>
          <p className="text-sm text-slate-400 mt-1">Tambahkan mapping untuk mengatur routing notifikasi</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Approver</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {mappings.map(mapping => {
                  const isEditing = editingId === mapping.id;
                  const level = getRoleLevel(mapping.role_name);
                  return (
                    <tr key={mapping.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      {/* Role */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">{mapping.role_name}</p>
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', getRoleBadgeColor(level))}>
                              Lv. {level ?? '?'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{mapping.approver_email}</span>
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Nama (opsional)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        ) : (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {mapping.approver_name || '-'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveInlineEdit(mapping)}
                              disabled={savingInline}
                              className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                              title="Simpan"
                            >
                              {savingInline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="Batal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startInlineEdit(mapping)}
                              className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(mapping)}
                              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MailCheck className="w-5 h-5 text-blue-500" />
                Tambah Mapping Email
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Role Dropdown */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Role</label>
                <select
                  value={addRoleId}
                  onChange={e => setAddRoleId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Pilih role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Lv. {r.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Email Approver</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="approver@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nama (opsional)</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Nama approver"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !addRoleId || !addEmail.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tambah Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
