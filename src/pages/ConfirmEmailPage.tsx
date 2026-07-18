import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { brand } from '../brand/config';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setErrorMessage('Token konfirmasi tidak ditemukan di URL. Pastikan Anda membuka link konfirmasi yang dikirim ke email Anda.');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');
          showToast('Email berhasil dikonfirmasi!', 'success');
        } else {
          setStatus('error');
          setErrorMessage('Sesi tidak dapat dibuat. Token mungkin sudah kedaluwarsa.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message ?? 'Terjadi kesalahan saat konfirmasi email.');
      }
    })();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mengkonfirmasi Email...</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Mohon tunggu, sedang memverifikasi akun Anda.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Email Terkonfirmasi!</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Akun Anda telah berhasil diaktifkan. Anda sekarang dapat masuk untuk mengakses {brand.name}.
              </p>
              <button onClick={() => navigate('/')} className="btn-primary mt-6 w-full">
                <ArrowLeft className="h-4 w-4" />
                Ke Beranda
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Konfirmasi Gagal</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {errorMessage || 'Terjadi kesalahan saat konfirmasi email. Link mungkin sudah kedaluwarsa atau tidak valid.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4" />
                <span>Pastikan Anda menggunakan link terbaru dari email.</span>
              </div>
              <button onClick={() => navigate('/auth')} className="btn-secondary mt-6 w-full">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Halaman Masuk
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
