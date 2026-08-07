import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => show(msg, 'success', dur), [show]);
  const error = useCallback((msg: string, dur?: number) => show(msg, 'error', dur), [show]);
  const info = useCallback((msg: string, dur?: number) => show(msg, 'info', dur), [show]);
  const warning = useCallback((msg: string, dur?: number) => show(msg, 'warning', dur), [show]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠️';
      case 'info': default: return 'ℹ️';
    }
  };

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
            role="alert"
          >
            <span className="toast-icon">{getIcon(toast.type)}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
