import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'brand' | 'gray'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  className = '',
  children,
  ...props
}) => {
  const variants = {
    success: 'bg-success-light text-success-dark',
    warning: 'bg-warning-light text-warning-dark',
    danger: 'bg-danger-light text-danger-dark',
    brand: 'bg-brand-50 text-brand-700',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <span
      className={`badge inline-flex items-center px-2.5 py-0.5 rounded-pill text-label-sm font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}