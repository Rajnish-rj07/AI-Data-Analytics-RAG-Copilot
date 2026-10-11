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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search column names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs transition"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
          {['ALL', 'NUMERIC', 'CATEGORICAL', 'DATETIME'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] whitespace-nowrap ${
                filterType === type
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
              className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3"
            >
              {/* Header: Name + Dtype */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm tracking-tight">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{col.dtype}</span>
                </div>
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    isNumeric
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isCategorical
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isNumeric ? 'Numeric' : isCategorical ? 'Categorical' : 'Feature'}
                </span>
              </div>

              {/* Completeness / Null Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Missing Values</span>
                  <span className={`font-mono font-semibold ${hasNulls ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {col.nullCount || 0} ({col.nullPct || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      col.nullPct > 10 ? 'bg-rose-500' : col.nullPct > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(col.nullPct || 0, hasNulls ? 5 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Unique Values Count */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium">Unique Cardinality</span>
                <span className="font-mono text-slate-800 font-bold text-[11px]">
                  {col.uniqueCount ? col.uniqueCount.toLocaleString() : 'N/A'}
                </span>
              </div>

              {/* Statistics Section */}
              {isNumeric && (
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Min / Max</span>
                    <span className="font-mono text-slate-800 font-semibold truncate block">
                      {col.min} → {col.max}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-medium">Mean / Median</span>
                    <span className="font-mono text-emerald-700 font-semibold truncate block">
                      {col.mean} / {col.median}
                    </span>
                  </div>
                  {col.std !== undefined && (
                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] font-medium">Std Deviation</span>
                      <span className="font-mono text-slate-700 font-semibold">{col.std}</span>
                    </div>
                  )}
                </div>
              )}

              {isCategorical && col.topValue && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] font-medium block">Top Frequency (Mode)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {col.topValue}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 font-medium">
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
