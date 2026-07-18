import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

type ConfirmState = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const [state, setState] = useState<ConfirmState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setState('error');
          setErrorMsg('Token tidak ditemukan di URL. Pastikan Anda mengklik link konfirmasi dari email.');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setState('error');
          setErrorMsg(error.message || 'Gagal mengkonfirmasi email. Token mungkin sudah kedaluwarsa.');
          return;
        }

        if (data.session) {
          setState('success');
        } else {
          setState('error');
          setErrorMsg('Sesi tidak dapat dibuat. Silakan coba masuk secara manual.');
        }
      } catch (err: any) {
        setState('error');
        setErrorMsg(err?.message || 'Terjadi kesalahan tak terduga.');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
          {state === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Memverifikasi Email...</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mohon tunggu sebentar, kami sedang mengkonfirmasi email Anda.
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email Terkonfirmasi!</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Email Anda berhasil diverifikasi. Akun siap digunakan.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
              >
                Lanjut ke Beranda
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfirmasi Gagal</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{errorMsg}</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Ke Halaman Masuk
                </Link>
                <Link
                  to="/"
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500"
                >
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
