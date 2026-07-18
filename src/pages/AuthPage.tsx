import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { brandConfig } from '../brand/config';
import { Mail, Lock, User, Loader2, LogIn, UserPlus, CheckCircle } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsConfirmation(false);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Berhasil masuk!', 'success');
        navigate('/');
      }
    } else {
      if (password.length < 6) {
        showToast('Password minimal 6 karakter', 'error');
        setLoading(false);
        return;
      }
      const { error, needsConfirmation: needsConf } = await signUp(email, password, name);
      if (error) {
        showToast(error, 'error');
      } else if (needsConf) {
        setNeedsConfirmation(true);
        showToast('Akun dibuat! Cek email untuk verifikasi.', 'info');
      } else {
        showToast('Pendaftaran berhasil!', 'success');
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{brandConfig.system.name}</h1>
          <p className="text-sm text-blue-100 mt-1">{brandConfig.system.fullName}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          {/* Toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-700 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Daftar
            </button>
          </div>

          {needsConfirmation ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Cek Email Anda</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Kami telah mengirim link konfirmasi ke <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>.
                Klik link tersebut untuk mengaktifkan akun Anda.
              </p>
              <button
                onClick={() => { setMode('login'); setNeedsConfirmation(false); }}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Sudah konfirmasi? Masuk di sini
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-5 h-5" /> Masuk
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" /> Daftar
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
