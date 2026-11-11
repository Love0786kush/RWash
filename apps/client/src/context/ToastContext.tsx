import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const parseToastMessage = (msg: any): string => {
    if (!msg) return 'An unexpected error occurred. Please try again.'
    if (typeof msg === 'string') {
      if (msg === '{}' || msg.trim() === '') return 'An unexpected error occurred. Please try again.'
      return msg
    }
    // Handle standard Error / AuthError / Error objects
    if (msg instanceof Error || (typeof msg === 'object' && msg.message)) {
      if (typeof msg.message === 'string' && msg.message.trim() && msg.message !== '{}') {
        return msg.message
      }
    }
    if (typeof msg === 'object') {
      if (msg.error_description && typeof msg.error_description === 'string') return msg.error_description
      if (msg.error && typeof msg.error === 'string') return msg.error
      if (msg.msg && typeof msg.msg === 'string') return msg.msg
      try {
        const str = JSON.stringify(msg)
        if (str !== '{}') return str
      } catch {}
    }
    return 'An unexpected error occurred. Please try again.'
  }

  const showToast = useCallback((message: any, type: ToastType = 'success', duration = 3500) => {
    const safeMessage = parseToastMessage(message)
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message: safeMessage, type, duration }])
    
    if (duration) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
