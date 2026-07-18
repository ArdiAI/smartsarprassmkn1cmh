import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Format email tidak valid';
    if (!password) e.password = 'Password wajib diisi';
    else if (password.length < 6) e.password = 'Password minimal 6 karakter';
    if (mode === 'register' && !name.trim()) e.name = 'Nama wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          showToast(error, 'error');
          return;
        }
        showToast('Berhasil masuk', 'success');
        navigate('/');
      } else {
        const { error } = await signUp(email.trim(), password, name.trim());
        if (error) {
          showToast(error, 'error');
          return;
        }
        showToast('Pendaftaran berhasil! Silakan cek email untuk konfirmasi.', 'success');
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-white/70">{brand.tagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          {/* Toggle */}
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => { setMode('login'); setErrors({}); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'login'
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </button>
            <button
              onClick={() => { setMode('register'); setErrors({}); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'register'
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <UserPlus className="h-4 w-4" />
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className={cn('input pl-10', errors.name && 'border-red-500')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className={cn('input pl-10', errors.email && 'border-red-500')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@sekolah.sch.id"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className={cn('input pl-10', errors.password && 'border-red-500')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Memproses...' : 'Mendaftar...'}
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Masuk
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Daftar
                </>
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Setelah mendaftar, Anda akan menerima email konfirmasi untuk mengaktifkan akun.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
