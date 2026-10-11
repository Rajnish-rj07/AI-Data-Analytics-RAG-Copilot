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
  '#059669', // Emerald (Primary Brand)
  '#475569', // Slate (Secondary Dimension)
  '#0f766e', // Deep Teal (Tertiary Category)
  '#0284c7', // Muted Ocean (Comparative Series)
  '#d97706', // Warm Ochre (Accent / Highlight)
  '#4f46e5', // Soft Indigo (Supplementary)
]

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-lg text-xs text-slate-800">
      <p className="font-bold text-slate-900 truncate max-w-[160px]">{d.category}</p>
      <p className="text-emerald-700 mt-0.5">Frequency: <span className="font-mono font-bold">{d.count}</span></p>
      <p className="text-slate-600">Distribution: <span className="font-mono font-bold">{d.pct}%</span></p>
    </div>
  )
}

function PieLegend({ payload }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[10px] max-w-full px-2">
      {payload.map((entry, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-600 font-medium truncate max-w-[90px]">{entry.value}</span>
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
      <h3 className="text-xs sm:text-sm font-bold text-slate-900 px-1 flex items-center gap-2">
        Categorical Column Breakdown
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {profiles.length} categorical columns
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {profiles.map((col) => {
          const topCats = col.top_categories || []
          const mode = getMode(col.name)
          const pieData = topCats.map((c) => ({
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
              className="rounded-xl p-5 bg-white border border-slate-200/90 shadow-2xs space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    {col.unique_count} distinct • {col.count} observations
                    {col.null_count > 0 ? ` • ${col.null_count} null` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isHighCardinality && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                      High cardinality
                    </span>
                  )}
                  {topCats.length > 2 && (
                    <button
                      onClick={() => toggleMode(col.name)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition cursor-pointer"
                    >
                      {mode === 'bar' ? 'Pie View' : 'Bar View'}
                    </button>
                  )}
                </div>
              </div>

              {topCats.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  No distinct categories recorded
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
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCats}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 4, bottom: 0 }}
                      barCategoryGap="16%"
                    >
                      <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fill: '#475569', fontSize: 9 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        width={85}
                        tickFormatter={(v) => (String(v).length > 12 ? String(v).slice(0, 12) + '…' : String(v))}
                      />
                      <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                        {topCats.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
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
                    className="text-[10px] px-2 py-0.5 rounded-full border font-mono font-medium"
                    style={{
                      borderColor: PALETTE[i % PALETTE.length] + '40',
                      color: PALETTE[i % PALETTE.length],
                      background: PALETTE[i % PALETTE.length] + '10',
                    }}
                  >
                    {cat.category}: {cat.pct}%
                  </span>
                ))}
                {col.top_categories?.length > 6 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 font-mono">
                    +{col.top_categories.length - 6} more
                  </span>
                )}
              </div>

              {/* Mode pill */}
              {col.mode && (
                <div className="text-[11px] text-slate-500">
                  Mode: <span className="text-slate-800 font-semibold">{col.mode}</span>
                  <span className="text-slate-400 ml-1">({col.mode_count} occurrences)</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
