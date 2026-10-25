import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[#191919] border border-[#383838] text-white p-3.5 rounded-xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-150"
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-white" />
            ) : toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <Info className="w-4 h-4 text-[#A3A3A3]" />
            )}
          </div>

          <div className="flex-1 text-xs text-[#E5E5E5] leading-snug">
            {toast.text}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 p-1 text-[#777777] hover:text-white rounded cursor-pointer transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
