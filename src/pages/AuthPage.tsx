import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { brandConfig } from '../brand/config';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) { setError(error); return; }
        navigate('/');
      } else {
        const { error, needsConfirmation } = await signUp(email, password, name);
        if (error) { setError(error); return; }
        if (needsConfirmation) setConfirmationSent(true);
        else navigate('/');
      }
    } finally { setLoading(false); }
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Registrasi Berhasil!</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Kami telah mengirim email konfirmasi ke <strong>{email}</strong>. Silakan cek email Anda dan klik link konfirmasi untuk mengaktifkan akun.</p>
            <p className="text-xs text-slate-400 mb-6">Belum menerima email? Cek folder spam atau tunggu beberapa menit.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Kembali ke Halaman Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3"><Building2 className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{brandConfig.system.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{brandConfig.system.fullName}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            {(['login', 'register'] as const).map(m => <button key={m} onClick={() => { setMode(m); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>{m === 'login' ? 'Masuk' : 'Daftar'}</button>)}
          </div>
          {error && <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Nama lengkap" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div>}
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@example.com" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg disabled:opacity-60">{loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>{mode === 'login' ? 'Masuk' : 'Daftar'} <ArrowRight className="w-4 h-4" /></>}</button>
          </form>
          {mode === 'register' && <p className="text-xs text-slate-400 text-center mt-4">Dengan mendaftar, Anda akan menerima email konfirmasi untuk mengaktifkan akun.</p>}
        </div>
      </div>
    </div>
  );
}
