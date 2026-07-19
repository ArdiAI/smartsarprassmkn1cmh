import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Email dan password wajib diisi', 'error');
      return;
    }
    if (mode === 'register' && !name) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Berhasil masuk!', 'success');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Pendaftaran berhasil! Cek email untuk konfirmasi.', 'success');
          setMode('login');
          setName('');
          setPassword('');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-brand-100">{brand.tagline}</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* Toggle */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setMode('login')}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'login'
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'register'
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@sekolah.sch.id"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            {mode === 'login'
              ? 'Belum punya akun? Klik Daftar untuk membuat akun baru.'
              : 'Sudah punya akun? Klik Masuk untuk melanjutkan.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-sm text-brand-100 hover:text-white"
        >
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
