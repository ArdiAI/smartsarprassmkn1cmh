import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { brand } from '../brand/config';

type ConfirmState = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash;
        if (!hash) {
          setState('error');
          setErrorMessage('Token konfirmasi tidak ditemukan di URL.');
          return;
        }

        // Parse access_token and refresh_token from URL hash
        const params = new URLSearchParams(
          hash.startsWith('#') ? hash.substring(1) : hash,
        );
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setState('error');
          setErrorMessage('Token konfirmasi tidak lengkap.');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setState('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.session && data.user) {
          setState('success');
          // Auto redirect after a short delay
          setTimeout(() => navigate('/'), 2500);
        } else {
          setState('error');
          setErrorMessage('Sesi tidak dapat dibuat. Token mungkin sudah kedaluwarsa.');
        }
      } catch (err) {
        setState('error');
        setErrorMessage('Terjadi kesalahan saat konfirmasi email.');
      }
    })();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4 py-8">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-lg">
            <Building2 className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-white/70">Konfirmasi Email</p>
        </div>

        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Memverifikasi Email</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Mohon tunggu, sedang memverifikasi akun Anda...
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Email Terkonfirmasi!</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Akun Anda telah berhasil diverifikasi. Anda akan diarahkan ke halaman utama...
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary mt-6"
              >
                Ke Halaman Utama
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Konfirmasi Gagal</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {errorMessage || 'Terjadi kesalahan saat konfirmasi email.'}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/auth" className="btn-primary">
                  <Mail className="h-4 w-4" />
                  Ke Halaman Masuk
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Beranda
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
