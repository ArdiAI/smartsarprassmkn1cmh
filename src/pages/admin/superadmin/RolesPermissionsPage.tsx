import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Pencil, Trash2, Shield, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ role: any | null; open: boolean }>({ role: null, open: false });
  const [form, setForm] = useState({ name: '', level: 50, description: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const [{ data: r }, { data: p }, { data: rp }] = await Promise.all([supabase.from('roles').select('*').order('level', { ascending: false }), supabase.from('permissions').select('*').order('module'), supabase.from('role_permissions').select('role_id, permission_id')]);
    setRoles(r || []); setPermissions(p || []);
    const m: Record<string, Set<string>> = {}; (r || []).forEach((role: any) => { m[role.id] = new Set(); }); (rp || []).forEach((x: any) => { if (m[x.role_id]) m[x.role_id].add(x.permission_id); }); setMatrix(m); setLoading(false);
  }
  async function togglePerm(rid: string, pid: string) { if (matrix[rid]?.has(pid)) { await supabase.from('role_permissions').delete().eq('role_id', rid).eq('permission_id', pid); matrix[rid].delete(pid); } else { await supabase.from('role_permissions').insert({ role_id: rid, permission_id: pid }); matrix[rid].add(pid); } setMatrix({ ...matrix }); }
  async function save() { if (modal.role) { await supabase.from('roles').update(form).eq('id', modal.role.id); } else { await supabase.from('roles').insert(form); } setModal({ role: null, open: false }); fetch(); }
  async function del(id: string) { if (!confirm('Hapus role?')) return; await supabase.from('roles').delete().eq('id', id); fetch(); }
  if (loading) return <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />;
  const modules = [...new Set(permissions.map((p: any) => p.module))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1><p className="text-slate-600 dark:text-slate-400">Kelola role dan hak akses</p></div><button onClick={() => { setForm({ name: '', level: 50, description: '' }); setModal({ role: null, open: true }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah Role</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{roles.map((r: any) => (<div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><span className="font-medium text-slate-900 dark:text-white">{r.name}</span></div><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Lv {r.level}</span></div><p className="text-xs text-slate-500 mb-3">{r.description || '-'}</p><div className="flex gap-2"><button onClick={() => { setForm({ name: r.name, level: r.level, description: r.description }); setModal({ role: r, open: true }); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button><button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button></div></div>))}</div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"><h2 className="font-semibold text-slate-900 dark:text-white p-4 border-b border-slate-200 dark:border-slate-700">Matrix Permissions</h2><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-700/50">Permission</th>{roles.map((r: any) => <th key={r.id} className="px-4 py-3 text-xs font-medium text-slate-500 text-center whitespace-nowrap">{r.name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{modules.map(mod => (<>{modules.length > 0 && <tr key={mod} className="bg-slate-50 dark:bg-slate-700/30"><td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">{mod}</td></tr>}{permissions.filter((p: any) => p.module === mod).map((p: any) => (<tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30"><td className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800">{p.name}</td>{roles.map((r: any) => <td key={r.id} className="px-4 py-2 text-center"><input type="checkbox" checked={matrix[r.id]?.has(p.id) || false} onChange={() => togglePerm(r.id, p.id)} className="rounded" /></td>)}</tr>))}</>))}</tbody></table></div></div>
      {modal.open && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal({ role: null, open: false })}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{modal.role ? 'Edit' : 'Tambah'} Role</h2><button onClick={() => setModal({ role: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button></div><div className="space-y-3"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama Role" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><input type="number" value={form.level} onChange={e => setForm({ ...form, level: parseInt(e.target.value) })} placeholder="Level" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" /><button onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button></div></div></div>)}
    </div>
  );
}
