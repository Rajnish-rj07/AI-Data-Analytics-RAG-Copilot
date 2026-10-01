import React, { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'


function getDtypeBadge(dtype = '') {
  const d = dtype.toLowerCase()
  if (d.includes('int') || d.includes('float') || d.includes('num')) {
    return { label: 'NUM', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }
  }
  if (d.includes('date') || d.includes('time')) {
    return { label: 'DATE', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  }
  if (d.includes('bool')) {
    return { label: 'BOOL', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
  }
  return { label: 'TEXT', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' }
}

export default function DataPreviewTable({ dataset }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const columns = dataset.columnNames || (dataset.columns ? dataset.columns.map((c) => c.name) : [])
  const previewRows = dataset.preview || []

  // Create a quick lookup for column types
  const colTypeMap = useMemo(() => {
    const map = {}
    if (dataset.columns) {
      dataset.columns.forEach((c) => {
        map[c.name] = c.dtype
      })
    }
    return map
  }, [dataset.columns])

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return previewRows
    const lower = searchTerm.toLowerCase()
    return previewRows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(lower)
      )
    )
  }, [previewRows, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  if (!columns.length) {
    return (
      <div className="p-8 text-center text-slate-400 glass-panel rounded-xl">
        No columns available in this dataset.
      </div>
    )
  }

  return (
    <div className="rounded-2xl glass-panel border border-slate-800 bg-[#0f1629]/90 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search within preview rows..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <span className="font-mono text-[11px] text-slate-400">
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} sample rows
          </span>
        </div>
      </div>

      {/* Scrollable Table View */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-[#151f38] border-b border-slate-700/80">
            <tr>
              <th className="p-3 w-12 text-center text-slate-500 font-mono text-[11px] bg-[#151f38] sticky left-0 z-30 border-r border-slate-800">
                #
              </th>
              {columns.map((colName) => {
                const badge = getDtypeBadge(colTypeMap[colName])
                return (
                  <th
                    key={colName}
                    className="p-3 px-4 font-semibold text-slate-200 whitespace-nowrap border-r border-slate-800/60 last:border-r-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-100">{colName}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500 text-xs">
                  No matching rows found in this preview.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const actualIndex = (currentPage - 1) * pageSize + rowIdx + 1
                return (
                  <tr
                    key={rowIdx}
                    className="hover:bg-indigo-500/[0.04] transition duration-150"
                  >
                    <td className="p-2.5 text-center text-slate-500 font-mono text-[10px] bg-[#0f1629] sticky left-0 z-10 border-r border-slate-800/80">
                      {actualIndex}
                    </td>
                    {columns.map((colName) => {
                      const val = row[colName]
                      const isNull = val === null || val === undefined || val === ''
                      return (
                        <td
                          key={colName}
                          className="p-2.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap border-r border-slate-800/40 last:border-r-0"
                        >
                          {isNull ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/90 text-[10px] border border-amber-500/20 italic">
                              null
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="text-cyan-300">{val.toLocaleString()}</span>
                          ) : (
                            <span>{String(val)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs bg-slate-900/60">
        <span className="text-[11px] text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
