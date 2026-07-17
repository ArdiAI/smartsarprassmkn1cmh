import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; type: ToastType; message: string; }

const ToastContext = createContext<{ show: (m: string, t?: ToastType) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm ${
            t.type === 'success' ? 'bg-emerald-500 text-white' : t.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
