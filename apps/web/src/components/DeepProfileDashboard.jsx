import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart2,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { datasetsApi } from '../services/api'
import CorrelationHeatmap from './CorrelationHeatmap'
import NumericalDistribution from './NumericalDistribution'
import CategoricalBreakdown from './CategoricalBreakdown'
import InsightsPanel from './InsightsPanel'

export default function DeepProfileDashboard({ dataset }) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeVizTab, setActiveVizTab] = useState('distributions')

  const datasetId = dataset?._id || dataset?.id

  const fetchProfile = useCallback(async () => {
    if (!datasetId) return
    setIsLoading(true)
    setError('')
    try {
      const res = await datasetsApi.getProfile(datasetId)
      if (res.success && res.deep_profile) {
        setProfile(res.deep_profile)
      } else {
        throw new Error('No profile data returned')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load profile.')
    } finally {
      setIsLoading(false)
    }
  }, [datasetId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 flex flex-col items-center justify-center gap-4 min-h-[260px] shadow-xs">
        <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">Computing Statistical Profile</p>
          <p className="text-xs text-slate-500 mt-1">
            Pandas engine calculating correlations, distributions & outliers...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-5 bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">Failed to Load Deep Profile</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (!profile) return null

  const hasCorrelations =
    profile.correlations?.columns?.length >= 2 && profile.correlations?.matrix?.length > 0
  const hasNumerical = profile.numerical_profiles?.length > 0
  const hasCategorical = profile.categorical_profiles?.length > 0

  return (
    <div className="space-y-6">
      {/* Quality Score Banner */}
      <QualityScoreBar score={profile.quality_score} insightCount={profile.insights?.length || 0} />

      {/* Insights Panel */}
      {profile.insights?.length > 0 && <InsightsPanel insights={profile.insights} />}

      {/* Viz Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
        {hasNumerical && (
          <TabBtn
            active={activeVizTab === 'distributions'}
            onClick={() => setActiveVizTab('distributions')}
            icon={<BarChart2 className="w-3.5 h-3.5" />}
            label="Distributions"
          />
        )}
        {hasCategorical && (
          <TabBtn
            active={activeVizTab === 'categorical'}
            onClick={() => setActiveVizTab('categorical')}
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Categorical"
          />
        )}
        {hasCorrelations && (
          <TabBtn
            active={activeVizTab === 'correlations'}
            onClick={() => setActiveVizTab('correlations')}
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Correlations"
          />
        )}
      </div>

      {/* Distribution Charts */}
      {activeVizTab === 'distributions' && hasNumerical && (
        <NumericalDistribution profiles={profile.numerical_profiles} />
      )}

      {/* Categorical Charts */}
      {activeVizTab === 'categorical' && hasCategorical && (
        <CategoricalBreakdown profiles={profile.categorical_profiles} />
      )}

      {/* Correlation Heatmap */}
      {activeVizTab === 'correlations' && hasCorrelations && (
        <CorrelationHeatmap correlations={profile.correlations} />
      )}
    </div>
  )
}

function QualityScoreBar({ score, insightCount }) {
  const scoreColor =
    score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-rose-700'
  const barColor =
    score >= 80 ? 'bg-emerald-600' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor'

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
      <div className="flex items-center gap-3.5">
        <div className="relative w-13 h-13 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(score / 100) * 100.5} 100.5`}
              strokeLinecap="round"
              className={scoreColor}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-black ${scoreColor}`}>{score}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">
            Data Quality Score: <span className={scoreColor}>{label}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Calculated from missing cell density, duplicate rows, and outlier distributions.
          </div>
        </div>
      </div>

      <div className="flex-1 w-full sm:w-auto">
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
          <span>0</span>
          <span className="text-slate-600 font-semibold">{score} / 100</span>
          <span>100</span>
        </div>
      </div>

      <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold whitespace-nowrap">
        {insightCount} insight{insightCount !== 1 ? 's' : ''} detected
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer text-xs whitespace-nowrap ${
        active
          ? 'bg-emerald-600 text-white shadow-2xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
