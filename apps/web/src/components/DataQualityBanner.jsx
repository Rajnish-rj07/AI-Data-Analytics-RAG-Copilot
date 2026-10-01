import React from 'react'
import { AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react'


export default function DataQualityBanner({ dataset }) {
  if (!dataset || !dataset.summary) return null


  const { duplicateRows = 0, totalMissingValues = 0, missingPercentage = 0 } = dataset.summary
  const hasIssues = duplicateRows > 0 || totalMissingValues > 0

  return (
    <div
      className={`rounded-2xl p-5 border glass-panel transition-all ${
        hasIssues
          ? 'bg-amber-500/[0.04] border-amber-500/25'
          : 'bg-emerald-500/[0.04] border-emerald-500/25'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              hasIssues
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {hasIssues ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                {hasIssues ? 'Data Hygiene Notice' : 'High Quality Dataset Detected'}
              </h3>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                  hasIssues
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {hasIssues ? 'Cleaning Recommended' : 'Ready for EDA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {hasIssues
                ? `Detected ${totalMissingValues} missing value${
                    totalMissingValues === 1 ? '' : 's'
                  } (${missingPercentage}%) and ${duplicateRows} duplicate row${
                    duplicateRows === 1 ? '' : 's'
                  }. In Phase 4, our AI Cleaning Assistant can automatically impute missing entries and dedup records.`
                : 'Zero missing values and zero duplicate rows found. The dataset structure is clean and consistent.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next: Phase 3 Profiling</span>
          </div>
        </div>
      </div>
    </div>
  )
}
