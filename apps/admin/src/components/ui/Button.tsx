import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 transition-colors',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors',
    danger: 'bg-danger text-white hover:bg-danger-dark transition-colors',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 transition-colors',
    outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 transition-colors',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-label-sm',
    md: 'px-4 py-2 text-body-md',
    lg: 'px-6 py-3 text-body-lg',
  }

  return (
    <button
      className={`rounded-pill font-medium flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}