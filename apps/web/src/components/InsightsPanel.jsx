import React, { useState } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  BarChart2,
  ShieldCheck,
  Info,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const TYPE_CONFIG = {
  correlation: {
    icon: TrendingUp,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/25',
    labelColor: 'text-indigo-400',
  },
  outlier: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    labelColor: 'text-amber-400',
  },
  distribution: {
    icon: BarChart2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
    labelColor: 'text-purple-400',
  },
  quality: {
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    labelColor: 'text-emerald-400',
  },
  cardinality: {
    icon: Hash,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    labelColor: 'text-cyan-400',
  },
}

const SEVERITY_BORDER = {
  warning: 'border-amber-500/30',
  success: 'border-emerald-500/30',
  info: 'border-slate-700/60',
}

export default function InsightsPanel({ insights = [] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? insights : insights.slice(0, 5)

  if (!insights.length) return null

  return (
    <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Automated Statistical Insights
        </h3>
        <span className="text-[10px] text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {displayed.map((insight, idx) => {
          const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.quality
          const Icon = config.icon
          const severityBorder = SEVERITY_BORDER[insight.severity] || SEVERITY_BORDER.info

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg} ${severityBorder} transition hover:border-opacity-60`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg} border ${config.border}`}
              >
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-[11px] font-bold text-slate-100 leading-tight">
                    {insight.title}
                  </p>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${config.bg} ${config.labelColor} ${config.border}`}
                  >
                    {insight.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {insight.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more/less toggle */}
      {insights.length > 5 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show {insights.length - 5} More Insights
            </>
          )}
        </button>
      )}
    </div>
  )
}
