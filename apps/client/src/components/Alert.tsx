import React from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react'

interface AlertProps {
  type: 'success' | 'error' | 'warning';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-100 text-rose-800',
      icon: <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-100 text-amber-800',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />,
    },
  }

  const current = styles[type] || styles.warning

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${current.bg} animate-fade-in`} role="alert">
      {current.icon}
      <div className="flex-grow">
        <p className="text-xs font-semibold leading-5">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-black/5 rounded transition-colors text-slate-400 hover:text-slate-650"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
