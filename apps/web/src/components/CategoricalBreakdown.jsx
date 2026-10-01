import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from 'recharts'

const PALETTE = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs">
      <p className="font-bold text-slate-100 truncate max-w-[160px]">{d.category}</p>
      <p className="text-indigo-300 mt-0.5">Count: <span className="font-mono font-bold">{d.count}</span></p>
      <p className="text-cyan-300">Share: <span className="font-mono font-bold">{d.pct}%</span></p>
    </div>
  )
}

function PieLegend({ payload }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-[10px] max-w-full px-2">
      {payload.map((entry, i) => (
        <li key={i} className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-400 truncate max-w-[80px]">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default function CategoricalBreakdown({ profiles = [] }) {
  const [viewMode, setViewMode] = useState({}) // colName -> 'bar' | 'pie'

  if (!profiles.length) return null

  const getMode = (name) => viewMode[name] || 'bar'
  const toggleMode = (name) =>
    setViewMode((prev) => ({ ...prev, [name]: prev[name] === 'pie' ? 'bar' : 'pie' }))

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-200 px-1 flex items-center gap-2">
        Categorical Column Breakdown
        <span className="text-[10px] font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          {profiles.length} categorical columns
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {profiles.map((col, colIdx) => {
          const topCats = col.top_categories || []
          const mode = getMode(col.name)
          const pieData = topCats.map((c, i) => ({
            name: c.category,
            value: c.count,
            pct: c.pct,
            count: c.count,
            category: c.category,
          }))

          const isHighCardinality = col.cardinality_pct >= 95

          return (
            <div
              key={col.name}
              className="rounded-2xl p-5 glass-panel border border-slate-800 bg-slate-900/70 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    {col.unique_count} unique • {col.count} total
                    {col.null_count > 0 ? ` • ${col.null_count} null` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isHighCardinality && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                      High cardinality
                    </span>
                  )}
                  {topCats.length > 2 && (
                    <button
                      onClick={() => toggleMode(col.name)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
                    >
                      {mode === 'bar' ? '🥧 Pie' : '📊 Bar'}
                    </button>
                  )}
                </div>
              </div>

              {topCats.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-500">
                  No category data available
                </div>
              ) : mode === 'pie' && topCats.length >= 2 ? (
                /* Pie Chart */
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius="35%"
                        outerRadius="60%"
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                      <Legend content={<PieLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Bar Chart */
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCats}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 4, bottom: 0 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid horizontal={false} stroke="#1e293b" />
                      <XAxis
                        type="number"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                        tickFormatter={(v) => (v.length > 12 ? v.slice(0, 12) + '…' : v)}
                      />
                      <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                        {topCats.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {topCats.slice(0, 6).map((cat, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full border font-mono"
                    style={{
                      borderColor: PALETTE[i % PALETTE.length] + '50',
                      color: PALETTE[i % PALETTE.length],
                      background: PALETTE[i % PALETTE.length] + '12',
                    }}
                  >
                    {cat.category}: {cat.pct}%
                  </span>
                ))}
                {col.top_categories?.length > 6 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-500">
                    +{col.top_categories.length - 6} more
                  </span>
                )}
              </div>

              {/* Mode pill */}
              {col.mode && (
                <div className="text-[10px] text-slate-500">
                  Mode: <span className="text-slate-300 font-semibold">{col.mode}</span>
                  <span className="text-slate-600 ml-1">({col.mode_count} times)</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
