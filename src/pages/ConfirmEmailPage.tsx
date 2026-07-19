import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirm = async () => {
      try {
        const hash = window.location.hash;
        if (!hash) {
          setStatus('error');
          setMessage('Tautan konfirmasi tidak valid. Token tidak ditemukan.');
          return;
        }

        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setMessage('Token tidak ditemukan di URL.');
          return;
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus('error');
          setMessage(error.message ?? 'Gagal mengonfirmasi email.');
          return;
        }

        if (data?.session || data?.user) {
          setStatus('success');
          setMessage(
            type === 'signup'
              ? 'Email berhasil dikonfirmasi! Akun Anda aktif sekarang.'
              : 'Sesi berhasil dipulihkan.',
          );
          showToast('Email berhasil dikonfirmasi!', 'success');
          setTimeout(() => navigate('/'), 2500);
        } else {
          setStatus('error');
          setMessage('Tidak dapat membuat sesi dari token ini.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Terjadi kesalahan saat mengonfirmasi email.');
      }
    };

    confirm();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mengonfirmasi Email</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Mohon tunggu, sedang memverifikasi akun Anda...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Email Terkonfirmasi</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <p className="mt-4 text-xs text-slate-400">Anda akan diarahkan ke beranda...</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
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
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <button
              onClick={() => navigate('/auth')}
              className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Ke Halaman Login
            </button>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <MailCheck className="h-4 w-4" />
          SMART SARPRAS
        </div>
      </div>
    </div>
  );
}
