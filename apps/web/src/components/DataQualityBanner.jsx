import React from 'react'
import { AlertTriangle, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'

export default function DataQualityBanner({ dataset, onNavigateToClean }) {
  if (!dataset || !dataset.summary) return null

  const { duplicateRows = 0, totalMissingValues = 0, missingPercentage = 0 } = dataset.summary
  const hasIssues = duplicateRows > 0 || totalMissingValues > 0

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 border transition-all ${
        hasIssues
          ? 'bg-amber-50/60 border-amber-200/90'
          : 'bg-emerald-50/60 border-emerald-200/90'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              hasIssues
                ? 'bg-amber-100/70 border-amber-200 text-amber-700'
                : 'bg-emerald-100/70 border-emerald-200 text-emerald-700'
            }`}
          >
            {hasIssues ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                {hasIssues ? 'Data Hygiene & Quality Notice' : 'High Quality Dataset Verified'}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  hasIssues
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {hasIssues ? 'Action Needed' : 'Clean & Complete'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
              {hasIssues
                ? `Detected ${totalMissingValues} missing cell${
                    totalMissingValues === 1 ? '' : 's'
                  } (${missingPercentage}%) and ${duplicateRows} duplicate row${
                    duplicateRows === 1 ? '' : 's'
                  }. You can review imputed values and deduplicate records in the Cleaning Studio.`
                : 'Zero missing values and zero duplicate records found. Dataset structure is complete and ready for deep exploratory analysis.'}
            </p>
          </div>
        </div>

        {hasIssues && onNavigateToClean && (
          <button
            onClick={onNavigateToClean}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0"
          >
            <span>Open Cleaning Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
