import React, { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  Zap,
  Activity,
  Filter,
  Check,
  Copy,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  Concentration: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: PieIcon,
  },
  Correlation: {
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: TrendingUp,
  },
  Distribution: {
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: Activity,
  },
  'Value Driver': {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: Zap,
  },
  Volatility: {
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: Activity,
  },
}

export default function InsightsFeed({ insights = [] }) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [copiedId, setCopiedId] = useState(null)

  if (!insights.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-800">No Specific Outliers or Anomalies Detected</p>
        <p className="text-xs text-slate-500 mt-1">The dataset appears evenly distributed across standard metrics.</p>
      </div>
    )
  }

  const categories = ['ALL', ...Array.from(new Set(insights.map((i) => i.category || 'General')))]

  const filteredInsights = activeFilter === 'ALL'
    ? insights
    : insights.filter((i) => (i.category || 'General') === activeFilter)

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText?.(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
              activeFilter === cat
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            {cat} {cat === 'ALL' ? `(${insights.length})` : ''}
          </button>
        ))}
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((item) => {
          const conf = CATEGORY_CONFIG[item.category] || {
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            icon: Sparkles,
          }
          const IconComponent = conf.icon
          const isCopied = copiedId === item.id

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between hover:border-slate-300 transition space-y-3 shadow-2xs hover:shadow-xs"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${conf.bg} ${conf.border} border flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-4 h-4 ${conf.color}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${conf.color}`}>
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                    </div>
                  </div>

                  {item.impact && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${
                        item.impact === 'high'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      {item.impact} Impact
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Footer info & copy */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px] truncate max-w-[180px]">
                    {item.column}
                  </span>
                  {item.metric && (
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      {item.metric}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleCopy(item.id, `${item.title}: ${item.description}`)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition cursor-pointer font-medium"
                  title="Copy insight text"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 text-[10px] font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
