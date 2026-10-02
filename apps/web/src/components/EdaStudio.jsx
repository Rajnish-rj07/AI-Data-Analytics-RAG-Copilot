import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart2,
  Sparkles,
  SlidersHorizontal,
  Zap,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
  Hash,
  Database,
  Grid,
} from 'lucide-react'
import { datasetsApi } from '../services/api'
import RecommendedChartsGallery from './RecommendedChartsGallery'
import CustomChartBuilder from './CustomChartBuilder'
import InsightsFeed from './InsightsFeed'

export default function EdaStudio({ dataset }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSubTab, setActiveSubTab] = useState('gallery') // 'gallery' | 'builder' | 'insights'

  const datasetId = dataset?._id || dataset?.id

  const fetchSummary = useCallback(async () => {
    if (!datasetId) return
    setLoading(true)
    setError('')
    try {
      const data = await datasetsApi.getEdaSummary(datasetId)
      setSummary(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not compute EDA summary.')
    } finally {
      setLoading(false)
    }
  }, [datasetId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (loading) {
    return (
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-12 flex flex-col items-center justify-center gap-4 min-h-[320px]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Executing Automated Exploratory Data Analysis…</p>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing distributions, calculating correlations & generating smart chart recommendations.
          </p>
        </div>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-2xl p-6 bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">EDA Processing Error</p>
            <p className="text-xs text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  if (!summary) return null

  const schema = summary.schema_info || {}
  const insights = summary.insights || []
  const recommendations = summary.recommendations || []

  return (
    <div className="space-y-6">
      {/* Top Stat Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black font-mono text-slate-100">{schema.total_rows?.toLocaleString() ?? 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Rows</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black font-mono text-slate-100">{schema.total_columns ?? 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Columns</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black font-mono text-purple-300">{schema.numerical_columns?.length ?? 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Numerical Metrics</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black font-mono text-emerald-300">{schema.categorical_columns?.length ?? 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Categorical Dimensions</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black font-mono text-amber-300">{insights.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Key Insights</div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'gallery'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Visuals</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 text-white">
              {recommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('builder')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'builder'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Visual Query Studio</span>
          </button>

          <button
            onClick={() => setActiveSubTab('insights')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'insights'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Statistical Insights</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 text-white">
              {insights.length}
            </span>
          </button>
        </div>

        <button
          onClick={fetchSummary}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Sub-tab 1: Smart Recommended Visuals */}
      {activeSubTab === 'gallery' && (
        <RecommendedChartsGallery recommendations={recommendations} />
      )}

      {/* Sub-tab 2: Visual Query Studio */}
      {activeSubTab === 'builder' && (
        <CustomChartBuilder dataset={dataset} schemaInfo={schema} />
      )}

      {/* Sub-tab 3: Statistical Insights Feed */}
      {activeSubTab === 'insights' && (
        <InsightsFeed insights={insights} />
      )}
    </div>
  )
}
