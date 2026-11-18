import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-[#237A57] shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          alert: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
          info: <Info className="w-4 h-4 text-[#174A8B] shrink-0" />,
        };

        const borderColors = {
          success: 'border-[#237A57]/30 bg-emerald-50/95 dark:bg-[#11241C]/95',
          warning: 'border-amber-400/30 bg-amber-50/95 dark:bg-[#281E0E]/95',
          alert: 'border-rose-400/30 bg-rose-50/95 dark:bg-[#271015]/95',
          info: 'border-[#174A8B]/30 bg-blue-50/95 dark:bg-[#0E1A2B]/95',
        };

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderColors[toast.type]}`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-100">
              {icons[toast.type]}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 ml-2 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
