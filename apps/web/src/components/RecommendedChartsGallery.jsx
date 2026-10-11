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
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react'

const PALETTE = [
  '#059669', // Emerald (Primary Brand)
  '#475569', // Slate (Secondary Dimension)
  '#0f766e', // Deep Teal (Tertiary Category)
  '#0284c7', // Muted Ocean (Comparative Series)
  '#d97706', // Warm Ochre (Accent / Highlight)
  '#4f46e5', // Soft Indigo (Supplementary)
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-1 z-50 text-slate-800">
      {label && <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#059669' }}
            />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
          </div>
          <span className="font-mono font-bold text-slate-900">
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
      className={`rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between transition-all shadow-2xs hover:shadow-xs ${
        isExpanded ? 'col-span-full ring-2 ring-emerald-500/30' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {badge || type}
            </span>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>

        <button
          onClick={onToggleExpand}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {data[0]?.total !== undefined ? (
                <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} name="Total" />
              ) : (
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} name="Count" />
              )}
            </BarChart>
          )}

          {/* 2. Grouped Bar Chart */}
          {type === 'grouped_bar' && (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
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
                <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="bin"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#areaGradientLight)"
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
                wrapperStyle={{ fontSize: '11px', color: '#475569' }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="x"
                name={chart.x_col}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                dataKey="y"
                name={chart.y_col}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Data Points" data={data} fill="#059669" />
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
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-2 shadow-2xs">
        <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-bold text-slate-800">No Recommended Visuals Available</p>
        <p className="text-xs text-slate-500">
          Try uploading a dataset with a mix of categorical and numerical columns.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{recommendations.length} visuals automatically discovered from schema and cardinality.</span>
        <span className="font-mono text-[11px] text-emerald-700 font-semibold">Recharts Engine</span>
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
