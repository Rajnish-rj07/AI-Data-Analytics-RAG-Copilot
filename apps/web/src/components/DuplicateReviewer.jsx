import React, { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, Trash2, Eye } from 'lucide-react'

export default function DuplicateReviewer({ issue, enabled, onToggle }) {
  const [showSample, setShowSample] = useState(false)

  if (!issue) return null

  const sampleCols = issue.sample_rows?.[0] ? Object.keys(issue.sample_rows[0]) : []

  return (
    <div className={`rounded-xl border overflow-hidden transition shadow-2xs ${
      enabled ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200/90 bg-white'
    }`}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            enabled ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-900">Duplicate Row Removal</p>
            <p className="text-xs text-slate-500">
              <span className="text-amber-800 font-bold">{issue.count}</span> exact duplicate row{issue.count !== 1 ? 's' : ''} detected
              ({issue.pct}% of dataset) — first occurrence will be preserved.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-3">
          {issue.sample_rows?.length > 0 && (
            <button
              onClick={() => setShowSample((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              {showSample ? 'Hide Preview' : 'Preview Samples'}
            </button>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-slate-600">{enabled ? 'Active' : 'Bypass'}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
              <div className={`w-10 h-5 rounded-full border-2 transition ${
                enabled ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-200 border-slate-300'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Sample Duplicate Rows */}
      {showSample && issue.sample_rows?.length > 0 && (
        <div className="px-4 sm:px-5 pb-5 space-y-2">
          <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Trash2 className="w-3 h-3 text-amber-700" /> Sample duplicate records that will be purged:
          </p>
          <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="bg-amber-50 text-amber-900 border-b border-amber-200">
                  {sampleCols.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {issue.sample_rows.map((row, i) => (
                  <tr key={i} className="hover:bg-amber-50/30">
                    {sampleCols.map((col) => (
                      <td key={col} className="px-3 py-1.5 text-slate-700 font-medium whitespace-nowrap">
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
              + {issue.count - issue.sample_rows.length} more duplicate records detected in dataset.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
