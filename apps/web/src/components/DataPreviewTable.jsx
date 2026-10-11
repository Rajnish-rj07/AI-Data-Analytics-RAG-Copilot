import React, { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

function getDtypeBadge(dtype = '') {
  const d = dtype.toLowerCase()
  if (d.includes('int') || d.includes('float') || d.includes('num')) {
    return { label: 'NUM', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
  }
  if (d.includes('date') || d.includes('time')) {
    return { label: 'DATE', color: 'bg-amber-50 text-amber-800 border-amber-200' }
  }
  if (d.includes('bool')) {
    return { label: 'BOOL', color: 'bg-sky-50 text-sky-800 border-sky-200' }
  }
  return { label: 'TEXT', color: 'bg-slate-100 text-slate-700 border-slate-200' }
}

export default function DataPreviewTable({ dataset }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const columns = dataset.columnNames || (dataset.columns ? dataset.columns.map((c) => c.name) : [])
  const previewRows = dataset.preview || []

  // Column types map
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
      <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        No columns available in this dataset.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search preview rows..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs transition"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <span className="font-mono text-[11px] text-slate-500">
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} sample rows
          </span>
        </div>
      </div>

      {/* Scrollable Table View */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 w-12 text-center text-slate-500 font-mono text-[11px] font-bold bg-slate-50 sticky left-0 z-30 border-r border-slate-200">
                #
              </th>
              {columns.map((colName) => {
                const badge = getDtypeBadge(colTypeMap[colName])
                return (
                  <th
                    key={colName}
                    className="p-3 px-4 font-bold text-slate-800 whitespace-nowrap border-r border-slate-200/80 last:border-r-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-900">{colName}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                    className="hover:bg-slate-50 transition duration-100"
                  >
                    <td className="p-2.5 text-center text-slate-500 font-mono text-[11px] font-medium bg-slate-50/80 sticky left-0 z-10 border-r border-slate-200">
                      {actualIndex}
                    </td>
                    {columns.map((colName) => {
                      const val = row[colName]
                      const isNull = val === null || val === undefined || val === ''
                      return (
                        <td
                          key={colName}
                          className="p-2.5 px-4 text-slate-700 font-mono text-[11px] whitespace-nowrap border-r border-slate-100 last:border-r-0"
                        >
                          {isNull ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] border border-amber-200 italic font-sans font-medium">
                              null
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="text-slate-900 font-semibold">{val.toLocaleString()}</span>
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
      <div className="p-3 border-t border-slate-200/80 flex items-center justify-between text-xs bg-slate-50/70">
        <span className="text-[11px] text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
