import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: string
  icon?: React.ReactNode
}

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: StatsCardProps) {
  return (
    <div className="rwash-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-sm text-gray-500">{title}</p>
          <h3 className="text-h2 font-bold text-gray-900 mt-1">{value}</h3>
          {subtitle && <p className="text-body-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <div className="text-gray-200">{icon}</div>}
      </div>
      {trend && (
        <p className={`mt-2 text-label-sm ${trend.startsWith('-') ? 'text-danger' : 'text-success'}`}>
          {trend}
        </p>
      )}
    </div>
  )
}