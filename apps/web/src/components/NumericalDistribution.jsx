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

const PRIMARY_BAR_COLOR = '#059669'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-lg text-xs text-slate-800">
      <p className="font-bold text-slate-900 mb-0.5">{label}</p>
      <p className="text-emerald-700 font-medium">
        Frequency: <span className="font-mono font-bold">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

function StatPill({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="flex flex-col px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      <span className={`text-xs font-bold font-mono ${color} mt-0.5 truncate`}>
        {value ?? 'N/A'}
      </span>
    </div>
  )
}

export default function NumericalDistribution({ profiles = [] }) {
  if (!profiles.length) return null

  return (
    <div className="space-y-6">
      <h3 className="text-xs sm:text-sm font-bold text-slate-900 px-1 flex items-center gap-2">
        Numerical Feature Distributions
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {profiles.length} numerical columns
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {profiles.map((col) => {
          const histData = col.histogram || []
          const chartColor = PRIMARY_BAR_COLOR
          const hasOutliers = col.outliers?.count > 0

          return (
            <div
              key={col.name}
              className="rounded-xl p-5 bg-white border border-slate-200/90 shadow-2xs space-y-4"
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{col.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{col.type} • {col.count} values</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {col.null_count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                      {col.null_count} missing
                    </span>
                  )}
                  {hasOutliers && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                      {col.outliers.count} outliers
                    </span>
                  )}
                  {col.skewness !== undefined && Math.abs(col.skewness) > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      skewed {col.skewness > 0 ? 'right' : 'left'}
                    </span>
                  )}
                </div>
              </div>

              {/* Histogram Chart */}
              {histData.length > 0 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histData} margin={{ top: 4, right: 4, left: -20, bottom: 2 }} barCategoryGap="12%">
                      <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="bin"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(5, 150, 105, 0.06)' }} />
                      <Bar
                        dataKey="count"
                        fill={chartColor}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  Insufficient data for histogram
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Min" value={col.min} />
                <StatPill label="Mean" value={col.mean} color="text-emerald-700" />
                <StatPill label="Max" value={col.max} />
                <StatPill label="Q25" value={col.q25} />
                <StatPill label="Median" value={col.median} color="text-slate-900" />
                <StatPill label="Q75" value={col.q75} />
              </div>

              {/* Outlier Box */}
              {hasOutliers && (
                <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-800 font-bold text-[11px]">
                      Tukey IQR Outlier Thresholds
                    </span>
                    <span className="font-mono text-rose-700 text-[11px] font-semibold">
                      {col.outliers.count} outlier{col.outliers.count > 1 ? 's' : ''} ({col.outliers.pct}%)
                    </span>
                  </div>
                  <p className="text-slate-600 text-[10px]">
                    Valid Range: [{col.outliers.lower_bound} — {col.outliers.upper_bound}]
                    {col.outliers.sample_values?.length > 0 && (
                      <> • Sample outliers: {col.outliers.sample_values.slice(0, 3).join(', ')}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
