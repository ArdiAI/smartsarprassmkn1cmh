import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={cn('pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl backdrop-blur-md animate-slide-in',
              toast.type === 'success' ? 'bg-green-50/90 dark:bg-green-900/90 border border-green-200 dark:border-green-700' :
              toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/90 border border-red-200 dark:border-red-700' :
              toast.type === 'warning' ? 'bg-yellow-50/90 dark:bg-yellow-900/90 border border-yellow-200 dark:border-yellow-700' :
              'bg-blue-50/90 dark:bg-blue-900/90 border border-blue-200 dark:border-blue-700')}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" /> :
             toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" /> :
             toast.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" /> :
             <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />}
            <p className={cn('flex-1 text-sm',
              toast.type === 'success' ? 'text-green-800 dark:text-green-200' :
              toast.type === 'error' ? 'text-red-800 dark:text-red-200' :
              toast.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
              'text-blue-800 dark:text-blue-200')}>
              {toast.message}
            </p>
            <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
