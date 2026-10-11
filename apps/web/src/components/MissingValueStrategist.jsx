import React, { useState } from 'react'
import { Droplets, ChevronDown, ChevronUp, Info } from 'lucide-react'

const STRATEGY_META = {
  mean:              { label: 'Fill with Mean',       desc: 'Replace nulls with column average. Best for normally distributed numerical data.' },
  median:            { label: 'Fill with Median',     desc: 'Replace nulls with the middle value. Robust against outliers.' },
  mode:              { label: 'Fill with Mode',       desc: 'Replace nulls with the most frequent value.' },
  zero:              { label: 'Fill with Zero',       desc: 'Replace nulls with 0. Only when zero has semantic significance.' },
  constant_unknown:  { label: "Fill 'Unknown'",       desc: "Replace nulls with 'Unknown'. Recommended for categorical features." },
  drop_rows:         { label: 'Drop Rows',            desc: 'Remove all rows containing nulls in this column.' },
}

export default function MissingValueStrategist({ issues = [], strategies = {}, onChange }) {
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
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-left">
            <p className="text-xs sm:text-sm font-bold text-slate-900">Missing Value Imputation</p>
            <p className="text-xs text-slate-500">{issues.length} column{issues.length !== 1 ? 's' : ''} with nulls — configure imputation strategy per feature</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-slate-100">
          {issues.map((issue) => {
            const current = strategies[issue.column] || issue.suggested_strategy
            const currentMeta = STRATEGY_META[current] || {}
            const availableStrategies = issue.available_strategies || []

            return (
              <div key={issue.column} className="pt-4 space-y-3">
                {/* Column Info */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{issue.column}</span>
                    <span className="ml-2 text-[10px] font-mono text-slate-500 font-semibold">{issue.dtype}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-rose-700 font-semibold">
                        {issue.null_count} nulls ({issue.null_pct}%)
                      </span>
                      {issue.is_numeric && issue.col_mean !== null && (
                        <span className="text-[11px] text-slate-500">
                          Mean: <span className="font-semibold text-slate-700">{issue.col_mean}</span> · Median: <span className="font-semibold text-slate-700">{issue.col_median}</span>
                        </span>
                      )}
                      {!issue.is_numeric && issue.col_mode && (
                        <span className="text-[11px] text-slate-500">
                          Mode: <span className="font-semibold text-slate-700">'{issue.col_mode}'</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {issue.suggested_strategy === current && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                      AI Recommended
                    </span>
                  )}
                </div>

                {/* Strategy Buttons */}
                <div className="flex flex-wrap gap-2">
                  {availableStrategies.map((s) => {
                    const meta = STRATEGY_META[s] || { label: s, desc: '' }
                    const isActive = current === s
                    const isSuggested = issue.suggested_strategy === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStrategy(issue.column, s)}
                        title={meta.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {meta.label}
                        {isSuggested && !isActive && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">AI</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected strategy description */}
                {currentMeta.desc && (
                  <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span>{currentMeta.desc}</span>
                  </div>
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
