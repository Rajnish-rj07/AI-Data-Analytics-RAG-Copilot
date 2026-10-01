import React from 'react'
import {
  CheckCircle2, Download, RefreshCw,
  ArrowRight, Rows3, AlertCircle,
  TrendingDown, Wand2,
} from 'lucide-react'

function StatChange({ label, before, after, lowerIsBetter = true }) {
  const improved = lowerIsBetter ? after < before : after > before
  const same = after === before
  const delta = after - before

  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-black font-mono text-slate-300">{before?.toLocaleString()}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className={`text-lg font-black font-mono ${
          same ? 'text-slate-300' : improved ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {after?.toLocaleString()}
        </span>
      </div>
      {!same && (
        <span className={`text-[10px] font-semibold ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta > 0 ? '+' : ''}{delta?.toLocaleString()} {improved ? '✓' : '↑'}
        </span>
      )}
      {same && <span className="text-[10px] text-slate-500">No change</span>}
    </div>
  )
}

function downloadCSV(b64, filename) {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CleaningResultPanel({ result, originalName, onReset }) {
  if (!result) return null

  const { before, after, change_log = [], rows_removed, total_changes, csv_b64, download_filename } = result

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-emerald-300">Cleaning Complete!</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {total_changes} operation{total_changes !== 1 ? 's' : ''} applied successfully.
            Cleaned CSV is ready for download.
          </p>
        </div>
        <button
          onClick={() => downloadCSV(csv_b64, download_filename)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      {/* Before / After Comparison */}
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-cyan-400" />
          Before vs After
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatChange label="Total Rows" before={before.rows} after={after.rows} lowerIsBetter={false} />
          <StatChange label="Missing Cells" before={before.missing_cells} after={after.missing_cells} lowerIsBetter={true} />
          <StatChange label="Duplicate Rows" before={before.duplicate_rows} after={after.duplicate_rows} lowerIsBetter={true} />
        </div>
        {rows_removed > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {rows_removed} row{rows_removed !== 1 ? 's' : ''} removed during cleaning. The downloaded CSV reflects this.
          </div>
        )}
      </div>

      {/* Change Log */}
      {change_log.length > 0 && (
        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Applied Changes
          </h3>
          <div className="space-y-2">
            {change_log.map((log, idx) => {
              const typeColor = {
                imputation:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                row_drop:      'bg-red-500/10 text-red-400 border-red-500/20',
                deduplication: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                outlier_cap:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
                outlier_drop:  'bg-red-500/10 text-red-400 border-red-500/20',
              }[log.type] || 'bg-slate-800 text-slate-400 border-slate-700'

              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${typeColor}`}>
                    {log.type.replace('_', ' ')}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-100">{log.strategy}</p>
                    {log.column !== 'all' && log.column !== 'multiple' && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Column: {log.column}</p>
                    )}
                  </div>
                  <span className="ml-auto text-[10px] text-slate-500 shrink-0 font-mono">
                    {log.rows_affected} row{log.rows_affected !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview of cleaned data */}
      {result.preview?.length > 0 && (
        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Rows3 className="w-4 h-4 text-slate-400" />
            Cleaned Data Preview
            <span className="text-[10px] text-slate-500 font-normal">
              (first {result.preview.length} rows)
            </span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="text-[10px] min-w-full">
              <thead>
                <tr className="bg-slate-800/60">
                  {(result.column_names || Object.keys(result.preview[0] || {})).map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-slate-400 font-bold whitespace-nowrap border-b border-slate-800">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-slate-800/40 hover:bg-slate-800/20">
                    {(result.column_names || Object.keys(row)).map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-red-400/60 italic">null</span>
                        ) : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => downloadCSV(csv_b64, download_filename)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" /> Download {download_filename}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Re-run Cleaning
        </button>
      </div>
    </div>
  )
}
