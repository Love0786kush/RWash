import React from 'react'

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', color = 'primary' }) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-14 w-14 border-4',
  }

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-solid border-t-transparent ${sizeClasses[size]}`}
        style={{
          borderColor: color === 'white' ? '#FFFFFF' : 'var(--theme-p, currentColor)',
          borderTopColor: 'transparent',
        }}
        role="status"
        aria-label="loading"
      />
    </div>
  )
}

export const FullPageSpinner: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md transition-colors duration-300"
      style={{
        backgroundColor: 'var(--theme-bg, #FFFFFF)',
        color: 'var(--theme-text, #0F172A)',
      }}
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer Glow Ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-25 animate-pulse"
          style={{ backgroundColor: 'var(--theme-p, #1D4ED8)' }}
        />
        {/* Animated Main Spinner */}
        <div
          className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent"
          style={{
            borderColor: 'var(--theme-p, #1D4ED8)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
      <p
        className="mt-5 text-xs font-black uppercase tracking-[0.2em] animate-pulse"
        style={{ color: 'var(--theme-p, #1D4ED8)' }}
      >
        Loading...
      </p>
    </div>
  )
}

// 100% Dynamic Theme-Adaptive Skeleton Loader (Zero Brown Shade)
export const SkeletonLoader: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 w-full p-3 rounded-2xl border"
          style={{
            backgroundColor: 'var(--theme-card, #FFFFFF)',
            borderColor: 'var(--theme-border, rgba(148, 163, 184, 0.2))',
          }}
        >
          {/* Skeleton Icon Box */}
          <div
            className="h-10 w-10 rounded-xl flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-p, #64748B) 14%, transparent)',
            }}
          />
          {/* Skeleton Text Lines */}
          <div className="flex-1 space-y-2 py-1">
            <div
              className="h-3.5 rounded-full w-2/5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-p, #64748B) 16%, transparent)',
              }}
            />
            <div
              className="h-2.5 rounded-full w-3/4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-text, #64748B) 10%, transparent)',
              }}
            />
          </div>
          {/* Skeleton Action Pill */}
          <div
            className="h-8 w-20 rounded-xl flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-p, #64748B) 12%, transparent)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
