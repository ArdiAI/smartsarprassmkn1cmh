import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { brand } from '../brand/config';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Token konfirmasi tidak ditemukan di URL. Pastikan Anda membuka link konfirmasi yang dikirim ke email.');
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus('error');
          setMessage(error.message ?? 'Gagal mengonfirmasi email. Token mungkin sudah kedaluwarsa.');
          return;
        }

        setStatus('success');
        setMessage('Email Anda telah berhasil dikonfirmasi. Anda akan diarahkan ke halaman utama...');
        setTimeout(() => navigate('/'), 2500);
      } catch {
        setStatus('error');
        setMessage('Terjadi kesalahan saat mengonfirmasi email.');
      }
    })();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 px-4 py-12">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mengonfirmasi Email...</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Mohon tunggu sebentar.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Email Terkonfirmasi!</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <button onClick={() => navigate('/')} className="btn-primary mt-6 w-full">
                Ke Halaman Utama
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Konfirmasi Gagal</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <div className="mt-6 space-y-2">
                <button onClick={() => navigate('/auth')} className="btn-primary w-full">
                  <ArrowLeft className="h-4 w-4" /> Ke Halaman Masuk
                </button>
                <a
                  href="mailto:support@sekolah.sch.id"
                  className="btn-secondary w-full"
                >
                  <Mail className="h-4 w-4" /> Hubungi Bantuan
                </a>
              </div>
            </>
          )}

          <p className="mt-6 text-xs text-slate-400">{brand.name}</p>
        </div>
      </div>
    </div>
  );
}
