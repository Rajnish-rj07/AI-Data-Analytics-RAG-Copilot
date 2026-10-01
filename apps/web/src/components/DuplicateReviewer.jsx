import React, { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, Trash2, Eye } from 'lucide-react'

export default function DuplicateReviewer({ issue, enabled, onToggle }) {
  const [showSample, setShowSample] = useState(false)

  if (!issue) return null

  const sampleCols = issue.sample_rows?.[0] ? Object.keys(issue.sample_rows[0]) : []

  return (
    <div className={`rounded-2xl glass-panel border overflow-hidden transition ${
      enabled ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'
    }`}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 p-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            enabled ? 'bg-amber-500/15 border-amber-500/30' : 'bg-slate-800 border-slate-700'
          }`}>
            <Copy className={`w-4 h-4 ${enabled ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100">Duplicate Row Removal</p>
            <p className="text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">{issue.count}</span> exact duplicate row{issue.count !== 1 ? 's' : ''} detected
              ({issue.pct}% of dataset) — first occurrence will be kept.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-3">
          {issue.sample_rows?.length > 0 && (
            <button
              onClick={() => setShowSample((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              {showSample ? 'Hide' : 'Preview'}
            </button>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-400">{enabled ? 'Enabled' : 'Skip'}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
              <div className={`w-10 h-5 rounded-full border-2 transition ${
                enabled ? 'bg-amber-500 border-amber-400' : 'bg-slate-700 border-slate-600'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Sample Duplicate Rows */}
      {showSample && issue.sample_rows?.length > 0 && (
        <div className="px-5 pb-5 space-y-2">
          <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Trash2 className="w-3 h-3" /> Sample rows that will be removed:
          </p>
          <div className="overflow-x-auto rounded-xl border border-amber-500/20">
            <table className="text-[10px] min-w-full">
              <thead>
                <tr className="bg-amber-500/10">
                  {sampleCols.map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-amber-300 font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issue.sample_rows.map((row, i) => (
                  <tr key={i} className="border-t border-amber-500/10 hover:bg-amber-500/5">
                    {sampleCols.map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {issue.count > issue.sample_rows.length && (
            <p className="text-[10px] text-slate-500">
              + {issue.count - issue.sample_rows.length} more duplicate rows not shown.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
