import React, { useState } from 'react'
import { Droplets, ChevronDown, ChevronUp, Info } from 'lucide-react'

const STRATEGY_META = {
  mean:              { label: 'Fill with Mean',       color: 'text-cyan-400',    desc: 'Replace nulls with the column average. Best for normally distributed data.' },
  median:            { label: 'Fill with Median',     color: 'text-indigo-400',  desc: 'Replace nulls with the middle value. Better for skewed distributions.' },
  mode:              { label: 'Fill with Mode',       color: 'text-purple-400',  desc: 'Replace nulls with the most frequent value.' },
  zero:              { label: 'Fill with Zero',       color: 'text-amber-400',   desc: 'Replace nulls with 0. Use only when 0 is a meaningful value.' },
  constant_unknown:  { label: "Fill 'Unknown'",       color: 'text-amber-400',   desc: "Replace nulls with the string 'Unknown'. For categorical columns." },
  drop_rows:         { label: 'Drop Rows',            color: 'text-red-400',     desc: 'Remove all rows where this column is null. May lose significant data.' },
}

export default function MissingValueStrategist({ issues = [], strategies = {}, onChange }) {
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
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100">Missing Value Imputation</p>
            <p className="text-xs text-slate-400">{issues.length} column{issues.length !== 1 ? 's' : ''} with nulls — review the strategy for each</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800/60">
          {issues.map((issue) => {
            const current = strategies[issue.column] || issue.suggested_strategy
            const currentMeta = STRATEGY_META[current] || {}
            const availableStrategies = issue.available_strategies || []

            return (
              <div key={issue.column} className="pt-4 space-y-3">
                {/* Column Info */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-sm font-bold text-slate-100">{issue.column}</span>
                    <span className="ml-2 text-[10px] font-mono text-slate-500">{issue.dtype}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-red-400 font-semibold">
                        {issue.null_count} nulls ({issue.null_pct}%)
                      </span>
                      {issue.is_numeric && issue.col_mean !== null && (
                        <span className="text-[10px] text-slate-500">
                          Mean: <span className="text-slate-300">{issue.col_mean}</span> · Median: <span className="text-slate-300">{issue.col_median}</span>
                        </span>
                      )}
                      {!issue.is_numeric && issue.col_mode && (
                        <span className="text-[10px] text-slate-500">
                          Mode: <span className="text-slate-300">'{issue.col_mode}'</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {issue.suggested_strategy === current && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                      AI Suggested
                    </span>
                  )}
                </div>

                {/* Strategy Buttons */}
                <div className="flex flex-wrap gap-2">
                  {availableStrategies.map((s) => {
                    const meta = STRATEGY_META[s] || { label: s, color: 'text-slate-300', desc: '' }
                    const isActive = current === s
                    const isSuggested = issue.suggested_strategy === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStrategy(issue.column, s)}
                        title={meta.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          isActive
                            ? `bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20`
                            : `bg-slate-800/60 ${meta.color} border-slate-700 hover:border-slate-500 hover:bg-slate-800`
                        }`}
                      >
                        {meta.label}
                        {isSuggested && !isActive && (
                          <span className="text-[8px] font-bold text-cyan-400 bg-cyan-500/10 px-1 rounded">AI</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected strategy description */}
                {currentMeta.desc && (
                  <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-800/30 rounded-lg px-3 py-2">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-slate-500" />
                    {currentMeta.desc}
                  </div>
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
