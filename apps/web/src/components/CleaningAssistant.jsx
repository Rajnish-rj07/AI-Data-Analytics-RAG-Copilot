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

  // User-editable strategies (pre-filled from AI suggestions)
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
    <div className="rounded-xl border border-slate-200 bg-white p-12 flex flex-col items-center justify-center gap-4 min-h-[260px] shadow-xs">
      <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900">Analysing Dataset Quality Gaps…</p>
        <p className="text-xs text-slate-500 mt-1">Scanning for missing values, duplicate rows & numerical outliers.</p>
      </div>
    </div>
  )

  if (error && !plan) return (
    <div className="rounded-xl p-5 bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-rose-800">Failed to Load Cleaning Plan</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
      </div>
      <button onClick={fetchPlan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-700 text-xs font-semibold cursor-pointer transition shadow-2xs">
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
        <div className="flex items-center gap-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Dataset Structure is Already Verified Clean</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Zero missing cells, zero duplicate rows, and zero statistical outliers were detected.
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
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-2xs">
          {/* User confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                confirmed ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 group-hover:border-slate-400 bg-white'
              }`}>
                {confirmed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                I have reviewed the proposed cleaning configuration
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Transformations will execute in-memory to generate an exportable clean CSV. Your original file in storage is never mutated.
              </p>
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> {error}
            </div>
          )}

          <button
            disabled={!confirmed || isCleaning}
            onClick={handleApplyCleaning}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs ${
              confirmed && !isCleaning
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            {isCleaning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Applying Cleaning Transformations…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Apply {totalIssues} Fix{totalIssues !== 1 ? 'es' : ''} & Generate Clean Dataset</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryBanner({ summary = {}, rowCount }) {
  const items = [
    { label: 'Total Rows', value: rowCount?.toLocaleString(), color: 'text-slate-900' },
    { label: 'Total Issues', value: summary.total_issues, color: summary.total_issues > 0 ? 'text-amber-700' : 'text-emerald-700' },
    { label: 'Missing Columns', value: summary.missing_columns, color: summary.missing_columns > 0 ? 'text-rose-700' : 'text-emerald-700' },
    { label: 'Duplicate Rows', value: summary.duplicate_rows, color: summary.duplicate_rows > 0 ? 'text-amber-700' : 'text-emerald-700' },
    { label: 'Outlier Features', value: summary.outlier_columns, color: summary.outlier_columns > 0 ? 'text-slate-700' : 'text-emerald-700' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <div key={item.label} className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className={`text-xl font-extrabold font-mono ${item.color}`}>{item.value ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
