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
      gradient: 'from-indigo-500/10 to-indigo-500/0',
      iconColor: 'text-indigo-400',
      borderColor: 'border-indigo-500/20',
    },
    {
      label: 'Total Columns',
      value: columnCount || (dataset.columnNames ? dataset.columnNames.length : 0),
      icon: Columns,
      subtext: 'Features profiled',
      gradient: 'from-cyan-500/10 to-cyan-500/0',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
    },
    {
      label: 'Missing Values',
      value: `${totalMissingValues || 0} (${missingPercentage || 0}%)`,
      icon: hasMissing ? AlertTriangle : CheckCircle2,
      subtext: hasMissing ? 'Requires imputation' : '100% complete fields',
      gradient: hasMissing ? 'from-amber-500/10 to-amber-500/0' : 'from-emerald-500/10 to-emerald-500/0',
      iconColor: hasMissing ? 'text-amber-400' : 'text-emerald-400',
      borderColor: hasMissing ? 'border-amber-500/20' : 'border-emerald-500/20',
    },
    {
      label: 'Duplicate Rows',
      value: duplicateRows || 0,
      icon: hasDuplicates ? AlertTriangle : CopyCheck,
      subtext: hasDuplicates ? 'Redundant records found' : 'All rows unique',
      gradient: hasDuplicates ? 'from-rose-500/10 to-rose-500/0' : 'from-emerald-500/10 to-emerald-500/0',
      iconColor: hasDuplicates ? 'text-rose-400' : 'text-emerald-400',
      borderColor: hasDuplicates ? 'border-rose-500/20' : 'border-emerald-500/20',
    },
    {
      label: 'File Size & Type',
      value: `${dataset.fileSizeKb || 0} KB`,
      icon: HardDrive,
      subtext: `${dataset.fileType ? dataset.fileType.toUpperCase() : 'CSV'} dataset`,
      gradient: 'from-purple-500/10 to-purple-500/0',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon
        return (
          <div
            key={idx}
            className={`relative p-4 rounded-xl glass-panel bg-gradient-to-b ${metric.gradient} border ${metric.borderColor} overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {metric.label}
              </span>
              <Icon className={`w-4 h-4 ${metric.iconColor}`} />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight font-mono">
              {metric.value}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {metric.subtext}
            </p>
          </div>
        )
      })}
    </div>
  )
}
