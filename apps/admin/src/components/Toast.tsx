import React from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToast, ToastItem } from '../context/ToastContext'

interface ToastProps {
  toast: ToastItem;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertTriangle className="h-5 w-5 text-amber-550" />,
    },
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-800',
      icon: <Info className="h-5 w-5 text-sky-500" />,
    },
  }

  const currentStyle = styles[toast.type] || styles.info

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full md:w-80 backdrop-blur-md animate-slide-up transition-all duration-300 ${currentStyle.bg}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{currentStyle.icon}</div>
      <div className="flex-grow">
        <p className="text-sm font-semibold leading-5">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 text-slate-400 hover:text-slate-600 rounded-lg p-0.5 hover:bg-black/5 transition-colors focus:outline-none"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-3 max-w-full px-4 md:px-0">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
