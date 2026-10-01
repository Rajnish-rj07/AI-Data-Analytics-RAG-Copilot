import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const STRATEGY_META = {
  cap:       { label: 'Cap to IQR Boundary',  color: 'text-amber-400',   desc: 'Clip extreme values to the IQR boundary. Preserves row count, reduces range.' },
  drop_rows: { label: 'Drop Outlier Rows',    color: 'text-red-400',     desc: 'Remove rows containing outliers. Reduces dataset size.' },
  keep:      { label: 'Keep As-Is',           color: 'text-slate-400',   desc: 'Leave outliers untouched. Choose this if the values are meaningful.' },
}

export default function OutlierHandler({ issues = [], strategies = {}, onChange }) {
  const [expanded, setExpanded] = useState(true)

  if (!issues.length) return null

  const setStrategy = (col, strategy) => {
    onChange({ ...strategies, [col]: strategy })
  }

  return (
    <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-800/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100">Outlier Handling</p>
            <p className="text-xs text-slate-400">
              {issues.length} column{issues.length !== 1 ? 's' : ''} with IQR-detected outliers
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-800/60 pt-4">
          {issues.map((issue) => {
            const current = strategies[issue.column] || issue.suggested_strategy || 'keep'
            const currentMeta = STRATEGY_META[current] || {}

            return (
              <div key={issue.column} className="space-y-3">
                {/* Column info */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-sm font-bold text-slate-100">{issue.column}</span>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-purple-400 font-semibold">
                        {issue.outlier_count} outlier{issue.outlier_count !== 1 ? 's' : ''} ({issue.outlier_pct}%)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        IQR bounds: [{issue.lower_bound} — {issue.upper_bound}]
                      </span>
                    </div>
                    {issue.sample_outliers?.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500">Sample values:</span>
                        {issue.sample_outliers.map((v, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {issue.suggested_strategy === current && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider whitespace-nowrap">
                      AI Suggested
                    </span>
                  )}
                </div>

                {/* Strategy Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {(issue.available_strategies || ['cap', 'drop_rows', 'keep']).map((s) => {
                    const meta = STRATEGY_META[s] || { label: s, color: 'text-slate-300', desc: '' }
                    const isActive = current === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStrategy(issue.column, s)}
                        title={meta.desc}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
                            : `bg-slate-800/60 ${meta.color} border-slate-700 hover:border-slate-500 hover:bg-slate-800`
                        }`}
                      >
                        {meta.label}
                      </button>
                    )
                  })}
                </div>

                {/* Strategy description */}
                {currentMeta.desc && (
                  <p className="text-[11px] text-slate-400 bg-slate-800/30 rounded-lg px-3 py-2">
                    {currentMeta.desc}
                  </p>
                )}

                <div className="border-b border-slate-800/60" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
