import React, { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  Zap,
  Activity,
  ArrowUpRight,
  Filter,
  Check,
  Copy,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  Concentration: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    icon: PieIcon,
  },
  Correlation: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    icon: TrendingUp,
  },
  Distribution: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
    icon: Activity,
  },
  'Value Driver': {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    icon: Zap,
  },
  Volatility: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
    icon: Activity,
  },
}

export default function InsightsFeed({ insights = [] }) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [copiedId, setCopiedId] = useState(null)

  if (!insights.length) {
    return (
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/40 p-8 text-center">
        <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No Specific Anomalies or Insights Detected</p>
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
              activeFilter === cat
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/25',
            icon: Sparkles,
          }
          const IconComponent = conf.icon
          const isCopied = copiedId === item.id

          return (
            <div
              key={item.id}
              className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${conf.bg} ${conf.border} border flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-4 h-4 ${conf.color}`} />
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${conf.color}`}>
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 leading-snug">{item.title}</h4>
                    </div>
                  </div>

                  {item.impact && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        item.impact === 'high'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {item.impact} Impact
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Footer info & copy */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px] truncate max-w-[180px]">
                    {item.column}
                  </span>
                  {item.metric && (
                    <span className="font-mono font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      {item.metric}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleCopy(item.id, `${item.title}: ${item.description}`)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Copy insight"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Copied</span>
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
