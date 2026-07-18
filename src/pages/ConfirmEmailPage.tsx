import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  LogIn,
  Home,
} from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { brand } from '../brand/config';

type State = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash;
        if (!hash) {
          setErrorMsg('Token konfirmasi tidak ditemukan di URL.');
          setState('error');
          return;
        }

        const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setErrorMsg('Token tidak lengkap. Pastikan Anda mengklik link konfirmasi yang valid.');
          setState('error');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setErrorMsg(error.message || 'Token tidak valid atau telah kedaluwarsa.');
          setState('error');
          return;
        }

        if (!data.session) {
          setErrorMsg('Sesi tidak dapat dibuat. Silakan coba masuk manual.');
          setState('error');
          return;
        }

        setState('success');
        showToast('Email berhasil dikonfirmasi!', 'success');
      } catch {
        setErrorMsg('Terjadi kesalahan saat mengkonfirmasi email.');
        setState('error');
      }
    })();
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mengkonfirmasi Email...</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Mohon tunggu, sedang memverifikasi akun Anda.
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Email Terkonfirmasi!</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Akun Anda telah berhasil diverifikasi. Anda sekarang dapat masuk ke aplikasi.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary flex-1"
                >
                  <Home className="h-4 w-4" />
                  Ke Beranda
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-secondary flex-1"
                >
                  <LogIn className="h-4 w-4" />
                  Masuk
                </button>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Konfirmasi Gagal</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {errorMsg || 'Terjadi kesalahan saat mengkonfirmasi email.'}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => navigate('/auth')}
                  className="btn-primary flex-1"
                >
                  <Mail className="h-4 w-4" />
                  Ke Halaman Masuk
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="btn-secondary flex-1"
                >
                  <Home className="h-4 w-4" />
                  Beranda
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-brand-100">
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </div>
  );
}
