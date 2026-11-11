import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-3">
      {label && (
        <label className="block text-label-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full border rounded-lg px-3 py-2 text-body-md ${
          error
            ? 'border-danger focus:ring-danger focus:border-danger'
            : 'border-gray-200 focus:ring-brand focus:border-brand'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-label-sm text-danger">{error}</p>
      )}
    </div>
  )
}