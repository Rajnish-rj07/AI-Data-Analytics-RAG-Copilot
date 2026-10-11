import React from 'react'
import { Rows, Columns, AlertTriangle, CopyCheck, HardDrive, CheckCircle2 } from 'lucide-react'

export default function MetricsRow({ dataset }) {
  if (!dataset || !dataset.summary) return null

  const { rowCount, columnCount, duplicateRows, totalMissingValues, missingPercentage } = dataset.summary
  const hasMissing = totalMissingValues > 0
  const hasDuplicates = duplicateRows > 0

  const metrics = [
    {
      label: 'Total Rows',
      value: rowCount ? rowCount.toLocaleString() : '0',
      icon: Rows,
      subtext: 'Observed records',
      iconColor: 'text-slate-600',
      badgeColor: 'bg-slate-100',
    },
    {
      label: 'Total Columns',
      value: columnCount || (dataset.columnNames ? dataset.columnNames.length : 0),
      icon: Columns,
      subtext: 'Features profiled',
      iconColor: 'text-slate-600',
      badgeColor: 'bg-slate-100',
    },
    {
      label: 'Missing Cells',
      value: `${totalMissingValues || 0} (${missingPercentage || 0}%)`,
      icon: hasMissing ? AlertTriangle : CheckCircle2,
      subtext: hasMissing ? 'Requires imputation' : 'Complete fields',
      iconColor: hasMissing ? 'text-amber-600' : 'text-emerald-600',
      badgeColor: hasMissing ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      label: 'Duplicate Rows',
      value: duplicateRows || 0,
      icon: hasDuplicates ? AlertTriangle : CopyCheck,
      subtext: hasDuplicates ? 'Redundant records' : 'All rows unique',
      iconColor: hasDuplicates ? 'text-rose-600' : 'text-emerald-600',
      badgeColor: hasDuplicates ? 'bg-rose-50' : 'bg-emerald-50',
    },
    {
      label: 'Size & Format',
      value: `${dataset.fileSizeKb || 0} KB`,
      icon: HardDrive,
      subtext: `${dataset.fileType ? dataset.fileType.toUpperCase() : 'CSV'} dataset`,
      iconColor: 'text-slate-600',
      badgeColor: 'bg-slate-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon
        return (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {metric.label}
              </span>
              <div className={`p-1.5 rounded-lg ${metric.badgeColor}`}>
                <Icon className={`w-3.5 h-3.5 ${metric.iconColor}`} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {metric.value}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate font-medium">
              {metric.subtext}
            </p>
          </div>
        )
      })}
    </div>
  )
}
