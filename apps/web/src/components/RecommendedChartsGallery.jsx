import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  BarChart2,
  PieChart as PieIcon,
  Activity,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react'

const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
      {label && <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#6366f1' }}
            />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
          </div>
          <span className="font-mono font-bold text-slate-100">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ chart, isExpanded, onToggleExpand }) {
  const { title, type, description, data = [], badge, series_keys = [] } = chart

  return (
    <div
      className={`rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between transition-all ${
        isExpanded ? 'col-span-full ring-2 ring-indigo-500/40' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {badge || type}
            </span>
            <h4 className="text-sm font-bold text-slate-100">{title}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>

        <button
          onClick={onToggleExpand}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand full width'}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Chart Canvas */}
      <div className={`w-full ${isExpanded ? 'h-[380px]' : 'h-[260px]'}`}>
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. Bar Chart */}
          {type === 'bar' && (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              {data[0]?.total !== undefined ? (
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} name="Total" />
              ) : (
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Count" />
              )}
            </BarChart>
          )}

          {/* 2. Grouped Bar Chart */}
          {type === 'grouped_bar' && (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {series_keys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={PALETTE[i % PALETTE.length]}
                  radius={[4, 4, 0, 0]}
                  name={key}
                />
              ))}
            </BarChart>
          )}

          {/* 3. Area / Distribution Histogram */}
          {type === 'area' && (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="bin"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#areaGradient)"
                name="Frequency"
              />
            </AreaChart>
          )}

          {/* 4. Donut / Pie Chart */}
          {type === 'pie' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={isExpanded ? 70 : 50}
                outerRadius={isExpanded ? 110 : 80}
                paddingAngle={4}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}

          {/* 5. Scatter Plot */}
          {type === 'scatter' && (
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="x"
                name={chart.x_col}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                dataKey="y"
                name={chart.y_col}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Data Points" data={data} fill="#06b6d4" />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function RecommendedChartsGallery({ recommendations = [] }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!recommendations.length) {
    return (
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/40 p-12 text-center space-y-2">
        <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-300">No Recommended Visuals Available</p>
        <p className="text-xs text-slate-500">
          Try uploading a dataset with a mix of categorical and numerical columns.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>{recommendations.length} visuals automatically generated from schema discovery.</span>
        <span className="font-mono text-[11px] text-cyan-400">Recharts 2.x Engine</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recommendations.map((chart) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            isExpanded={expandedId === chart.id}
            onToggleExpand={() => setExpandedId(expandedId === chart.id ? null : chart.id)}
          />
        ))}
      </div>
    </div>
  )
}
