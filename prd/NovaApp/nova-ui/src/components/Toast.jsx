import { useState, useEffect } from 'react';
import './Toast.css';

let toastId = 0;
let addToastGlobal = null;

/**
 * Show a toast notification from anywhere.
 * @param {string} message - Toast message
 * @param {'info'|'success'|'warning'|'error'} type - Toast type
 * @param {number} duration - Auto-dismiss in ms (default 5000)
 */
export function showToast(message, type = 'info', duration = 5000) {
  if (addToastGlobal) {
    addToastGlobal({ id: ++toastId, message, type, duration });
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastGlobal = (toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]); // Max 3
    };
    return () => { addToastGlobal = null; };
  }, []);

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`toast toast-${toast.type} animate-slide-in`}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-dismiss" onClick={onDismiss}>✕</button>
    </div>
  );
}
