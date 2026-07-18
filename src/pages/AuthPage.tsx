import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Loader2,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Email dan password wajib diisi', 'error');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, name.trim());
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      showToast(mode === 'login' ? 'Berhasil masuk' : 'Akun berhasil dibuat', 'success');
      navigate('/');
    } catch {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-brand-100">{brand.tagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          {/* Tabs */}
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setMode('login')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                mode === 'login'
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
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
                    className="input pl-10"
                    placeholder="Nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="email@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input px-10"
                  placeholder="Min. 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Memproses...' : 'Mendaftarkan...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? (
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
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              {mode === 'login' ? 'Daftar di sini' : 'Masuk di sini'}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-brand-100">
          © {new Date().getFullYear()} {brand.name}. {brand.school}
        </p>
      </div>
    </div>
  );
}
