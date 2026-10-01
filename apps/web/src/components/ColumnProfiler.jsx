import React, { useState } from 'react'
import { Search } from 'lucide-react'


export default function ColumnProfiler({ columns = [] }) {
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredColumns = columns.filter((col) => {
    const matchesSearch = col.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    const dtype = (col.dtype || '').toLowerCase()
    if (filterType === 'NUMERIC') {
      return dtype.includes('int') || dtype.includes('float') || dtype.includes('num')
    }
    if (filterType === 'CATEGORICAL') {
      return dtype.includes('object') || dtype.includes('category') || dtype.includes('str')
    }
    if (filterType === 'DATETIME') {
      return dtype.includes('date') || dtype.includes('time')
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Search and Type Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search column names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
          {['ALL', 'NUMERIC', 'CATEGORICAL', 'DATETIME'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] whitespace-nowrap ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredColumns.map((col) => {
          const isNumeric = col.mean !== undefined && col.mean !== null
          const isCategorical = col.topValue !== undefined && col.topValue !== null
          const hasNulls = col.nullCount > 0

          return (
            <div
              key={col.name}
              className="p-4 rounded-xl glass-panel bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
            >
              {/* Header: Name + Dtype */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm tracking-tight">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{col.dtype}</span>
                </div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    isNumeric
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                      : isCategorical
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                  }`}
                >
                  {isNumeric ? 'Numeric' : isCategorical ? 'Categorical' : 'Feature'}
                </span>
              </div>

              {/* Completeness / Null Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Missing Values</span>
                  <span className={`font-mono font-medium ${hasNulls ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {col.nullCount || 0} ({col.nullPct || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      col.nullPct > 10 ? 'bg-red-400' : col.nullPct > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(col.nullPct || 0, hasNulls ? 5 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Unique Values Count */}
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Unique Values</span>
                <span className="font-mono text-slate-200 font-semibold text-[11px]">
                  {col.uniqueCount ? col.uniqueCount.toLocaleString() : 'N/A'}
                </span>
              </div>

              {/* Statistics Section */}
              {isNumeric && (
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-800/30 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Min / Max</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {col.min} → {col.max}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/30 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Mean / Median</span>
                    <span className="font-mono text-cyan-300 truncate block">
                      {col.mean} / {col.median}
                    </span>
                  </div>
                  {col.std !== undefined && (
                    <div className="col-span-2 p-2 rounded bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Std Deviation</span>
                      <span className="font-mono text-slate-300">{col.std}</span>
                    </div>
                  )}
                </div>
              )}

              {isCategorical && col.topValue && (
                <div className="p-2.5 rounded bg-slate-800/30 border border-slate-800 space-y-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] block">Top Value (Mode)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300 truncate max-w-[140px]">
                      {col.topValue}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {col.topCount} occurrences
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
