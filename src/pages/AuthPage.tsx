import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, Loader2, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Email dan password wajib diisi', 'error');
      return;
    }
    if (mode === 'signup' && !name) {
      showToast('Nama wajib diisi', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          showToast('Gagal masuk: ' + error, 'error');
          return;
        }
        showToast('Berhasil masuk', 'success');
        navigate('/');
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          showToast('Gagal daftar: ' + error, 'error');
          return;
        }
        showToast('Pendaftaran berhasil! Silakan cek email untuk konfirmasi.', 'success');
        setMode('signin');
      }
    } catch (err) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4 py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-lg">
            <Building2 className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-white/70">{brand.tagline}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:p-8">
          {/* Mode toggle */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setMode('signin')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'signin'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </button>
            <button
              onClick={() => setMode('signup')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition',
                mode === 'signup'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <UserPlus className="h-4 w-4" />
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
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
                    required={mode === 'signup'}
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
                  type="password"
                  className="input pl-10"
                  placeholder="Min. 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : mode === 'signin' ? (
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

          {mode === 'signup' && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Setelah daftar, cek email Anda untuk verifikasi akun.
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
