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
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 border border-slate-200">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-bold font-mono text-slate-500">{before?.toLocaleString()}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className={`text-lg font-bold font-mono ${
          same ? 'text-slate-800' : improved ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {after?.toLocaleString()}
        </span>
      </div>
      {!same && (
        <span className={`text-[10px] font-semibold ${improved ? 'text-emerald-700' : 'text-rose-700'}`}>
          {delta > 0 ? '+' : ''}{delta?.toLocaleString()} {improved ? '✓ improved' : 'increased'}
        </span>
      )}
      {same && <span className="text-[10px] text-slate-400">No change</span>}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Cleaning Successfully Executed!</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {total_changes} transformation{total_changes !== 1 ? 's' : ''} applied. Cleaned CSV is generated and ready to download.
            </p>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(csv_b64, download_filename)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Clean CSV
        </button>
      </div>

      {/* Before / After Comparison */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-600" />
          Before vs After Comparison
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatChange label="Total Rows" before={before.rows} after={after.rows} lowerIsBetter={false} />
          <StatChange label="Missing Cells" before={before.missing_cells} after={after.missing_cells} lowerIsBetter={true} />
          <StatChange label="Duplicate Rows" before={before.duplicate_rows} after={after.duplicate_rows} lowerIsBetter={true} />
        </div>
        {rows_removed > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            {rows_removed} duplicate row{rows_removed !== 1 ? 's' : ''} removed from the active dataset.
          </div>
        )}
      </div>

      {/* Change Log */}
      {change_log.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-2xs">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-600" />
            Audit Log of Applied Transformations
          </h3>
          <div className="space-y-2">
            {change_log.map((log, idx) => {
              const typeBadge = {
                imputation:    'bg-sky-50 text-sky-800 border-sky-200',
                row_drop:      'bg-rose-50 text-rose-800 border-rose-200',
                deduplication: 'bg-amber-50 text-amber-800 border-amber-200',
                outlier_cap:   'bg-purple-50 text-purple-800 border-purple-200',
                outlier_drop:  'bg-rose-50 text-rose-800 border-rose-200',
              }[log.type] || 'bg-slate-100 text-slate-700 border-slate-200'

              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${typeBadge}`}>
                    {log.type.replace('_', ' ')}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{log.strategy}</p>
                    {log.column !== 'all' && log.column !== 'multiple' && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Feature: {log.column}</p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-slate-500 shrink-0 font-mono font-medium">
                    {log.rows_affected} record{log.rows_affected !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview of cleaned data */}
      {result.preview?.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-2xs">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <Rows3 className="w-4 h-4 text-emerald-600" />
            Cleaned Data Sample Preview
            <span className="text-[11px] text-slate-400 font-normal">
              (first {result.preview.length} rows)
            </span>
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  {(result.column_names || Object.keys(result.preview[0] || {})).map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {result.preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    {(result.column_names || Object.keys(row)).map((col) => (
                      <td key={col} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-amber-600 italic">null</span>
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" /> Download {download_filename}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Configure Another Plan
        </button>
      </div>
    </div>
  )
}
