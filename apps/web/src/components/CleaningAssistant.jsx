import React, { useState, useEffect, useCallback } from 'react'
import {
  Wand2, Loader2, AlertCircle, RefreshCw, CheckCircle2,
  ShieldCheck, Download, ChevronRight, Eye, Sparkles,
} from 'lucide-react'
import { datasetsApi } from '../services/api'
import MissingValueStrategist from './MissingValueStrategist'
import DuplicateReviewer from './DuplicateReviewer'
import OutlierHandler from './OutlierHandler'
import CleaningResultPanel from './CleaningResultPanel'

export default function CleaningAssistant({ dataset }) {
  const [plan, setPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  // User-editable strategies (start from AI suggestions)
  const [missingStrategies, setMissingStrategies] = useState({})
  const [fixDuplicates, setFixDuplicates] = useState(false)
  const [outlierStrategies, setOutlierStrategies] = useState({})

  const datasetId = dataset?._id || dataset?.id

  // ── Fetch cleaning plan ──────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    if (!datasetId) return
    setIsLoading(true)
    setError('')
    setResult(null)
    setConfirmed(false)
    try {
      const res = await datasetsApi.getCleaningPlan(datasetId)
      const cp = res.cleaning_plan
      setPlan(cp)

      // Pre-fill strategies from AI suggestions
      const ms = {}
      cp.missing_value_issues?.forEach((issue) => {
        ms[issue.column] = issue.suggested_strategy
      })
      setMissingStrategies(ms)
      setFixDuplicates(cp.duplicate_issue ? true : false)

      const os = {}
      cp.outlier_issues?.forEach((issue) => {
        os[issue.column] = issue.suggested_strategy
      })
      setOutlierStrategies(os)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not load cleaning plan.')
    } finally {
      setIsLoading(false)
    }
  }, [datasetId])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  // ── Apply cleaning ───────────────────────────────────────────────────────
  const handleApplyCleaning = async () => {
    setIsCleaning(true)
    setError('')
    try {
      const outlierBounds = {}
      plan.outlier_issues?.forEach((oi) => {
        outlierBounds[oi.column] = {
          lower_bound: oi.lower_bound,
          upper_bound: oi.upper_bound,
        }
      })

      const res = await datasetsApi.applyClean(datasetId, {
        missing_strategies: missingStrategies,
        fix_duplicates: fixDuplicates,
        outlier_strategies: outlierStrategies,
        outlier_bounds: outlierBounds,
      })
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cleaning failed.')
    } finally {
      setIsCleaning(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-12 flex flex-col items-center justify-center gap-4 min-h-[260px]">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-200">Analysing Dataset for Issues…</p>
        <p className="text-xs text-slate-400 mt-1">Scanning for missing values, duplicates & outliers.</p>
      </div>
    </div>
  )

  if (error && !plan) return (
    <div className="rounded-2xl p-6 bg-red-500/5 border border-red-500/25 flex items-center gap-4">
      <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-300">Failed to Load Cleaning Plan</p>
        <p className="text-xs text-slate-400 mt-0.5">{error}</p>
      </div>
      <button onClick={fetchPlan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer">
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  )

  if (!plan) return null

  // ── Clean dataset — show result panel ────────────────────────────────────
  if (result) return (
    <CleaningResultPanel
      result={result}
      originalName={dataset.originalName}
      onReset={() => { setResult(null); setConfirmed(false); fetchPlan() }}
    />
  )

  const totalIssues = plan.summary?.total_issues || 0
  const isClean = plan.summary?.is_clean

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <SummaryBanner summary={plan.summary} rowCount={plan.total_rows} />

      {/* Nothing to clean */}
      {isClean && (
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-300">Dataset is Already Clean!</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No missing values, duplicate rows, or statistical outliers were detected.
            </p>
          </div>
        </div>
      )}

      {/* Missing Values */}
      {plan.missing_value_issues?.length > 0 && (
        <MissingValueStrategist
          issues={plan.missing_value_issues}
          strategies={missingStrategies}
          onChange={setMissingStrategies}
        />
      )}

      {/* Duplicate Rows */}
      {plan.duplicate_issue && (
        <DuplicateReviewer
          issue={plan.duplicate_issue}
          enabled={fixDuplicates}
          onToggle={setFixDuplicates}
        />
      )}

      {/* Outliers */}
      {plan.outlier_issues?.length > 0 && (
        <OutlierHandler
          issues={plan.outlier_issues}
          strategies={outlierStrategies}
          onChange={setOutlierStrategies}
        />
      )}

      {/* Confirm + Apply */}
      {!isClean && (
        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          {/* User confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                confirmed ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'
              }`}>
                {confirmed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                I have reviewed the cleaning plan above
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                By confirming, you understand that data will be transformed in-memory and a new cleaned CSV will be generated. Your original file is not modified.
              </p>
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            disabled={!confirmed || isCleaning}
            onClick={handleApplyCleaning}
            className={`w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition ${
              confirmed && !isCleaning
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isCleaning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Applying Cleaning Plan…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Apply {totalIssues} Fix{totalIssues !== 1 ? 'es' : ''} & Generate Clean CSV</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryBanner({ summary = {}, rowCount }) {
  const items = [
    { label: 'Total Rows', value: rowCount?.toLocaleString(), color: 'text-slate-200' },
    { label: 'Issues Found', value: summary.total_issues, color: summary.total_issues > 0 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Missing Columns', value: summary.missing_columns, color: summary.missing_columns > 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'Duplicate Rows', value: summary.duplicate_rows, color: summary.duplicate_rows > 0 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'Outlier Columns', value: summary.outlier_columns, color: summary.outlier_columns > 0 ? 'text-purple-400' : 'text-emerald-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <div key={item.label} className="p-3.5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60">
          <div className={`text-xl font-black font-mono ${item.color}`}>{item.value ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
