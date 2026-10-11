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
    iconColor: 'text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  outlier: {
    icon: AlertTriangle,
    iconColor: 'text-amber-700',
    iconBg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  distribution: {
    icon: BarChart2,
    iconColor: 'text-slate-700',
    iconBg: 'bg-slate-100 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  quality: {
    icon: ShieldCheck,
    iconColor: 'text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  cardinality: {
    icon: Hash,
    iconColor: 'text-slate-700',
    iconBg: 'bg-slate-100 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
}

export default function InsightsPanel({ insights = [] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? insights : insights.slice(0, 6)

  if (!insights.length) return null

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          Automated Statistical Insights
        </h3>
        <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded font-mono font-semibold">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayed.map((insight, idx) => {
          const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.quality
          const Icon = config.icon

          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs transition"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${config.iconBg}`}
              >
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {insight.title}
                  </p>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${config.badge}`}
                  >
                    {insight.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {insight.detail}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more/less toggle */}
      {insights.length > 6 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show {insights.length - 6} More Insights
            </>
          )}
        </button>
      )}
    </div>
  )
}
