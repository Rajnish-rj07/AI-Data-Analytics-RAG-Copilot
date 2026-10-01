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

const SEVERITY_ICON = {
  success: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-cyan-400" />,
}

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
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-12 flex flex-col items-center justify-center gap-4 min-h-[260px]">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200">Computing Deep Statistical Profile</p>
          <p className="text-xs text-slate-400 mt-1">
            Pandas engine calculating correlations, distributions & outliers...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl p-6 bg-red-500/5 border border-red-500/25 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Failed to Load Profile</p>
          <p className="text-xs text-slate-400 mt-0.5">{error}</p>
        </div>
        <button
          onClick={fetchProfile}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
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
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
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
    score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  const barColor =
    score >= 80 ? 'from-emerald-500 to-emerald-400' : score >= 60 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor'

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" strokeWidth="4" />
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
            <span className={`text-sm font-extrabold ${scoreColor}`}>{score}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">
            Data Quality Score: <span className={scoreColor}>{label}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Calculated from missing values, duplicates, and outlier density.
          </div>
        </div>
      </div>

      <div className="flex-1 w-full sm:w-auto">
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>0</span>
          <span className="text-slate-400 font-medium">{score} / 100</span>
          <span>100</span>
        </div>
      </div>

      <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs whitespace-nowrap">
        {insightCount} insight{insightCount !== 1 ? 's' : ''} found
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
