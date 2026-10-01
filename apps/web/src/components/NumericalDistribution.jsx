import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
]

function CustomTooltip({ active, payload, label, colName }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      <p className="text-indigo-300">
        Count: <span className="font-mono font-bold">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

function StatPill({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="flex flex-col px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-800">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold font-mono ${color} mt-0.5`}>
        {value ?? 'N/A'}
      </span>
    </div>
  )
}

export default function NumericalDistribution({ profiles = [] }) {
  if (!profiles.length) return null

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-200 px-1 flex items-center gap-2">
        Numerical Column Distributions
        <span className="text-[10px] font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          {profiles.length} numerical columns
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {profiles.map((col, idx) => {
          const histData = col.histogram || []
          const chartColor = CHART_COLORS[idx % CHART_COLORS.length]
          const hasOutliers = col.outliers?.count > 0

          return (
            <div
              key={col.name}
              className="rounded-2xl p-5 glass-panel border border-slate-800 bg-slate-900/70 space-y-4"
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{col.type} • {col.count} values</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {col.null_count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                      {col.null_count} null
                    </span>
                  )}
                  {hasOutliers && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25">
                      {col.outliers.count} outliers
                    </span>
                  )}
                  {col.skewness !== undefined && Math.abs(col.skewness) > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/25">
                      skewed {col.skewness > 0 ? '→' : '←'}
                    </span>
                  )}
                </div>
              </div>

              {/* Histogram Chart */}
              {histData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histData} margin={{ top: 2, right: 4, left: -20, bottom: 2 }} barCategoryGap="10%">
                      <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="bin"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip colName={col.name} />} cursor={{ fill: 'rgba(99,102,241,0.1)' }} />
                      {col.mean !== null && (
                        <ReferenceLine x={`mean`} stroke="#6366f1" strokeDasharray="3 3" label="" />
                      )}
                      <Bar
                        dataKey="count"
                        fill={chartColor}
                        fillOpacity={0.8}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-500">
                  Not enough data for histogram
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Min" value={col.min} />
                <StatPill label="Mean" value={col.mean} color="text-cyan-300" />
                <StatPill label="Max" value={col.max} />
                <StatPill label="Q25" value={col.q25} />
                <StatPill label="Median" value={col.median} color="text-indigo-300" />
                <StatPill label="Q75" value={col.q75} />
              </div>

              {/* Outlier Box */}
              {hasOutliers && (
                <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-red-300 font-semibold text-[11px]">
                      IQR Outlier Detection
                    </span>
                    <span className="font-mono text-red-400 text-[11px]">
                      {col.outliers.count} outlier{col.outliers.count > 1 ? 's' : ''} ({col.outliers.pct}%)
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Bounds: [{col.outliers.lower_bound} — {col.outliers.upper_bound}]
                    {col.outliers.sample_values?.length > 0 && (
                      <> • Sample: {col.outliers.sample_values.slice(0,3).join(', ')}</>
                    )}
                  </p>
                </div>
              )}

              {/* Skewness badge */}
              {col.skewness !== undefined && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Skewness: <span className={`font-bold ${Math.abs(col.skewness) > 1 ? 'text-purple-400' : 'text-slate-300'}`}>
                    {col.skewness}
                  </span>
                  {Math.abs(col.skewness) > 1 && (
                    <span className="ml-1 text-slate-500">
                      ({col.skewness > 0 ? 'right-tailed' : 'left-tailed'})
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
