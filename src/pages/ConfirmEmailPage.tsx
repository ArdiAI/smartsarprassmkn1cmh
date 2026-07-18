import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    const error = params.get('error');
    const errorDescription = params.get('error_description') || params.get('error_code');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || error);
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus('error');
      setMessage('Token tidak ditemukan di URL. Pastifikasi Anda membuka link konfirmasi yang valid.');
      return;
    }

    (async () => {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        setStatus('error');
        setMessage(sessionError.message);
        showToast('Gagal mengonfirmasi email', 'error');
        return;
      }
      setStatus('success');
      setMessage(type === 'recovery' ? 'Email berhasil dikonfirmasi. Silakan atur ulang kata sandi Anda.' : 'Email Anda berhasil dikonfirmasi! Akun siap digunakan.');
      showToast('Email berhasil dikonfirmasi', 'success');
      // Auto-redirect after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">SMART SARPRAS</span>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mengonfirmasi Email...</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mohon tunggu sebentar.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfirmasi Berhasil</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
            <Link to="/" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors">
              Ke Beranda
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfirmasi Gagal</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-left">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-300">Coba buka link konfirmasi dari email Anda kembali, atau hubungi administrator jika masalah berlanjut.</p>
              </div>
            </div>
            <Link to="/auth" className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Kembali ke Masuk
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
