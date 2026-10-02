import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  SlidersHorizontal,
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Play,
  Loader2,
  AlertCircle,
  Table as TableIcon,
  RefreshCw,
} from 'lucide-react'
import { datasetsApi } from '../services/api'

const PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6',
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

export default function CustomChartBuilder({ dataset, schemaInfo }) {
  const datasetId = dataset?._id || dataset?.id

  const allColumns = dataset?.columns?.map((c) => c.name) || []
  const numColumns = schemaInfo?.numerical_columns || []
  const catColumns = schemaInfo?.categorical_columns || []

  // Builder state
  const [chartType, setChartType] = useState('bar')
  const [xCol, setXCol] = useState(catColumns[0] || allColumns[0] || '')
  const [yCol, setYCol] = useState(numColumns[0] || '')
  const [aggFunc, setAggFunc] = useState('sum')
  const [groupByCol, setGroupByCol] = useState('none')
  const [limit, setLimit] = useState(15)

  // Query result state
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDataTable, setShowDataTable] = useState(false)

  // Auto-init state on schema load
  useEffect(() => {
    if (catColumns.length && !xCol) setXCol(catColumns[0])
    if (numColumns.length && !yCol) setYCol(numColumns[0])
  }, [catColumns, numColumns])

  const executeQuery = useCallback(async () => {
    if (!datasetId || !xCol) return
    setLoading(true)
    setError('')

    try {
      const res = await datasetsApi.queryEdaAggregate(datasetId, {
        x_col: xCol,
        y_col: aggFunc === 'count' ? null : yCol,
        agg_func: aggFunc,
        group_by_col: groupByCol === 'none' ? null : groupByCol,
        limit: Number(limit),
      })
      setChartData(res)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to aggregate data for visualization.')
    } finally {
      setLoading(false)
    }
  }, [datasetId, xCol, yCol, aggFunc, groupByCol, limit])

  // Execute initial query once X and Y are populated
  useEffect(() => {
    if (xCol) {
      executeQuery()
    }
  }, [xCol, yCol, aggFunc, groupByCol, limit, executeQuery])

  const seriesKeys = chartData?.series_keys || ['value']
  const data = chartData?.data || []

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Visual Query Studio</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDataTable((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5" />
              {showDataTable ? 'Show Visual' : 'View Raw Data'}
            </button>
            <button
              onClick={executeQuery}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              Update Chart
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Chart Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Visual Style
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Donut / Pie</option>
            </select>
          </div>

          {/* 2. X-Axis */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              X-Axis (Dimension)
            </label>
            <select
              value={xCol}
              onChange={(e) => setXCol(e.target.value)}
              className="w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition font-mono"
            >
              {allColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* 3. Aggregation Function */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Metric Aggregation
            </label>
            <select
              value={aggFunc}
              onChange={(e) => setAggFunc(e.target.value)}
              className="w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition"
            >
              <option value="sum">Sum</option>
              <option value="mean">Average (Mean)</option>
              <option value="count">Count Records</option>
              <option value="median">Median</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>

          {/* 4. Y-Axis */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Y-Axis (Metric)
            </label>
            <select
              value={yCol}
              disabled={aggFunc === 'count'}
              onChange={(e) => setYCol(e.target.value)}
              className={`w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition font-mono ${
                aggFunc === 'count' ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              {numColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* 5. Group-By (Series) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Group-By (Pivot)
            </label>
            <select
              value={groupByCol}
              onChange={(e) => setGroupByCol(e.target.value)}
              className="w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition font-mono"
            >
              <option value="none">None (Single Series)</option>
              {catColumns.filter((c) => c !== xCol).map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* 6. Limit */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Max Items
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full text-xs rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 px-3 py-2 outline-none focus:border-indigo-500 transition"
            >
              <option value="10">Top 10</option>
              <option value="15">Top 15</option>
              <option value="25">Top 25</option>
              <option value="50">Top 50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Visual Canvas Panel */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 min-h-[420px] flex flex-col justify-between">
        {/* Visual Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {aggFunc.toUpperCase()}({aggFunc === 'count' ? '*' : yCol}) by {xCol}
            </span>
            {groupByCol !== 'none' && (
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                Pivoted across {groupByCol}
              </span>
            )}
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            {data.length} data point{data.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="h-[340px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">Computing Dynamic Aggregations via Pandas…</p>
          </div>
        )}

        {/* Raw Data Table view */}
        {!loading && showDataTable && (
          <div className="h-[340px] overflow-auto py-2">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 bg-slate-800/40">
                  <th className="px-4 py-2 text-left font-bold">{xCol}</th>
                  {seriesKeys.map((key) => (
                    <th key={key} className="px-4 py-2 text-right font-bold font-mono">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-4 py-2 font-semibold text-slate-200">{row.name}</td>
                    {seriesKeys.map((key) => (
                      <td key={key} className="px-4 py-2 text-right font-mono text-slate-300">
                        {typeof row[key] === 'number' ? row[key].toLocaleString() : row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chart View */}
        {!loading && !showDataTable && data.length > 0 && (
          <div className="w-full h-[340px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' && (
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    interval={0}
                    angle={data.length > 6 ? -25 : 0}
                    textAnchor={data.length > 6 ? 'end' : 'middle'}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />}
                  {seriesKeys.map((key, i) => (
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

              {chartType === 'line' && (
                <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    interval={0}
                    angle={data.length > 6 ? -25 : 0}
                    textAnchor={data.length > 6 ? 'end' : 'middle'}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />}
                  {seriesKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      name={key}
                    />
                  ))}
                </LineChart>
              )}

              {chartType === 'area' && (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                  <defs>
                    <linearGradient id="customAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    interval={0}
                    angle={data.length > 6 ? -25 : 0}
                    textAnchor={data.length > 6 ? 'end' : 'middle'}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {seriesKeys.map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#customAreaGrad)"
                      name={key}
                    />
                  ))}
                </AreaChart>
              )}

              {chartType === 'pie' && (
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                  <Pie
                    data={data}
                    dataKey={seriesKeys[0] || 'value'}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={3}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {!loading && !data.length && (
          <div className="h-[340px] flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <Activity className="w-8 h-8 text-slate-600" />
            <p>No records matched the selected query parameters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
