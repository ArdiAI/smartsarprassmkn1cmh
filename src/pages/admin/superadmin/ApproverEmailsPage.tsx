import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Mail, Shield, Plus, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface RoleApprover { id: string; role_id: string; role_name: string; approver_email: string; approver_name: string; is_active: boolean; }
interface Role { id: string; name: string; level: number; }

export default function ApproverEmailsPage() {
  const [approvers, setApprovers] = useState<RoleApprover[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMap, setEditMap] = useState<Record<string, { email: string; name: string; active: boolean }>>({});

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const [{ data: appData }, { data: roleData }] = await Promise.all([
      supabase.from('role_approver_emails').select('*').order('role_name'),
      supabase.from('roles').select('id, name, level').order('level', { ascending: false }),
    ]);
    setApprovers(appData || []);
    setRoles(roleData || []);
    const map: Record<string, { email: string; name: string; active: boolean }> = {};
    (appData || []).forEach(a => { map[a.role_id] = { email: a.approver_email, name: a.approver_name, active: a.is_active }; });
    setEditMap(map);
    setLoading(false);
  }

  async function save(roleId: string) {
    setSaving(true);
    const edit = editMap[roleId];
    if (!edit) { setSaving(false); return; }
    const existing = approvers.find(a => a.role_id === roleId);
    if (existing) {
      await supabase.from('role_approver_emails').update({
        approver_email: edit.email,
        approver_name: edit.name,
        is_active: edit.active,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      const role = roles.find(r => r.id === roleId);
      await supabase.from('role_approver_emails').insert({
        role_id: roleId,
        role_name: role?.name || '',
        approver_email: edit.email,
        approver_name: edit.name,
        is_active: edit.active,
      });
    }
    setSaving(false);
    fetch();
  }

  const rolesWithoutMapping = roles.filter(r => !approvers.some(a => a.role_id === r.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mapping Email Approver</h1>
        <p className="text-slate-600 dark:text-slate-400">Atur email notifikasi untuk setiap role approver dalam workflow persetujuan</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Cara Kerja Mapping Email Approver</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Saat pengajuan masuk atau berpindah step, sistem akan mengirim email notifikasi ke approver berdasarkan mapping di halaman ini.
              Pastikan email untuk setiap role approver (Pembina, Wakasek, PJ Fasilitas, Wakasek Sarpras) sudah diisi dengan benar.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Existing mappings */}
          {roles.map(role => {
            const existing = approvers.find(a => a.role_id === role.id);
            const edit = editMap[role.id] || { email: '', name: '', active: true };
            const isMapped = !!existing;
            return (
              <div key={role.id} className={cn(
                'bg-white dark:bg-slate-800 rounded-xl p-4 border-2 transition-colors',
                isMapped ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 dark:border-slate-600'
              )}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                    isMapped ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700')}>
                    <Shield className={cn('w-5 h-5', isMapped ? 'text-blue-500' : 'text-slate-400')} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{role.name}</p>
                    <p className="text-xs text-slate-400">Level {role.level}</p>
                  </div>
                  {isMapped && edit.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Aktif
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nama Approver</label>
                    <input type="text" value={edit.name} placeholder="Nama lengkap approver"
                      onChange={e => setEditMap(p => ({ ...p, [role.id]: { ...edit, name: e.target.value } }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email Approver</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" value={edit.email} placeholder="email@smkn1cimahi.sch.id"
                        onChange={e => setEditMap(p => ({ ...p, [role.id]: { ...edit, email: e.target.value } }))}
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={edit.active}
                      onChange={e => setEditMap(p => ({ ...p, [role.id]: { ...edit, active: e.target.checked } }))}
                      className="rounded" />
                    Aktifkan notifikasi
                  </label>
                  <button onClick={() => save(role.id)} disabled={saving || !edit.email}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Simpan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ringkasan Mapping</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Pembina', 'Wakasek Kesiswaan', 'Penanggung Jawab Fasilitas', 'Wakasek Sarpras'].map(roleName => {
            const mapped = approvers.find(a => a.role_name === roleName && a.is_active);
            return (
              <div key={roleName} className="flex items-center gap-2">
                {mapped ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
                <span className="text-xs text-slate-600 dark:text-slate-400">{roleName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
