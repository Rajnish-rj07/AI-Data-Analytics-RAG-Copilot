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
      <div className="rounded-xl border border-slate-200 bg-white p-12 flex flex-col items-center justify-center gap-4 min-h-[320px] shadow-xs">
        <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">Executing Automated Exploratory Data Analysis…</p>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing distributions, calculating correlations & generating smart chart recommendations.
          </p>
        </div>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl p-5 bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">EDA Processing Error</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
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
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">{schema.total_rows?.toLocaleString() ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Rows</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">{schema.total_columns ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Columns</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700">{schema.numerical_columns?.length ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Numerical Metrics</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">{schema.categorical_columns?.length ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Categorical Dimensions</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-800">{insights.length}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Key Insights</div>
          </div>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'gallery'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Visuals</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeSubTab === 'gallery' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {recommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('builder')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'builder'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Visual Query Studio</span>
          </button>

          <button
            onClick={() => setActiveSubTab('insights')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'insights'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Statistical Insights</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeSubTab === 'insights' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {insights.length}
            </span>
          </button>
        </div>

        <button
          onClick={fetchSummary}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer bg-white shadow-2xs font-semibold"
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
