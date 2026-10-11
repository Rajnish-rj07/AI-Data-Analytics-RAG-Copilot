import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

const STRATEGY_META = {
  cap:       { label: 'Cap to IQR Boundary',  desc: 'Clip extreme values to IQR boundary. Preserves row count, normalizes range.' },
  drop_rows: { label: 'Drop Outlier Rows',    desc: 'Remove rows containing extreme values. Reduces dataset size.' },
  keep:      { label: 'Keep As-Is',           desc: 'Leave outliers untouched. Recommended if extreme values represent authentic signals.' },
}

export default function OutlierHandler({ issues = [], strategies = {}, onChange }) {
  const [expanded, setExpanded] = useState(true)

  if (!issues.length) return null

  const setStrategy = (col, strategy) => {
    onChange({ ...strategies, [col]: strategy })
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-xs sm:text-sm font-bold text-slate-900">Statistical Outlier Treatment</p>
            <p className="text-xs text-slate-500">
              {issues.length} column{issues.length !== 1 ? 's' : ''} with IQR-detected extreme deviations
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {issues.map((issue) => {
            const current = strategies[issue.column] || issue.suggested_strategy || 'keep'
            const currentMeta = STRATEGY_META[current] || {}

            return (
              <div key={issue.column} className="space-y-3">
                {/* Column info */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{issue.column}</span>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-amber-800 font-semibold">
                        {issue.outlier_count} outlier{issue.outlier_count !== 1 ? 's' : ''} ({issue.outlier_pct}%)
                      </span>
                      <span className="text-[11px] text-slate-600 font-mono">
                        Valid range: [{issue.lower_bound} — {issue.upper_bound}]
                      </span>
                    </div>
                    {issue.sample_outliers?.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-500">Sample outliers:</span>
                        {issue.sample_outliers.map((v, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {issue.suggested_strategy === current && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider whitespace-nowrap">
                      AI Recommended
                    </span>
                  )}
                </div>

                {/* Strategy Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {(issue.available_strategies || ['cap', 'drop_rows', 'keep']).map((s) => {
                    const meta = STRATEGY_META[s] || { label: s, desc: '' }
                    const isActive = current === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStrategy(issue.column, s)}
                        title={meta.desc}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {meta.label}
                      </button>
                    )
                  })}
                </div>

                {/* Strategy description */}
                {currentMeta.desc && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    {currentMeta.desc}
                  </p>
                )}

                <div className="border-b border-slate-100" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
