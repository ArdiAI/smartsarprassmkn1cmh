import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';

export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'signup' && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setStatus('error');
            setMessage('Link konfirmasi tidak valid atau sudah kedaluwarsa.');
          } else {
            setStatus('success');
            setMessage('Email Anda berhasil dikonfirmasi!');
          }
        });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStatus('success');
          setMessage('Email Anda sudah dikonfirmasi!');
        } else {
          setStatus('error');
          setMessage('Link konfirmasi tidak valid.');
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Memverifikasi...</h1>
              <p className="text-sm text-slate-500">Mohon tunggu, sedang mengkonfirmasi email Anda.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Registrasi Berhasil!</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                Kembali ke Website {brandConfig.system.name}
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Konfirmasi Gagal</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                Ke Halaman Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
