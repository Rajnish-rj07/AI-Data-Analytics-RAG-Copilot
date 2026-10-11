import React, { useState, useRef } from 'react'
import { UploadCloud, ArrowUpRight, AlertCircle, Loader2, Sparkles, FileText } from 'lucide-react'
import { sampleDatasets, createSampleFile } from '../data/sampleDatasets'

export default function FileUploadZone({ onUploadSuccess, isUploading, uploadProgress, uploadStage }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0])
    }
  }

  const validateAndUpload = (file) => {
    setErrorMessage('')
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      setErrorMessage(`Unsupported format (${ext}). Please upload a .CSV or .XLSX file.`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File exceeds 50MB limit. Please upload a smaller dataset.')
      return
    }

    onUploadSuccess(file)
  }

  const handleLoadSample = (sample) => {
    const file = createSampleFile(sample)
    validateAndUpload(file)
  }

  return (
    <div className="w-full space-y-6">
      {/* Upload Drop Zone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative group rounded-xl p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer overflow-hidden border-2 ${
          isDragOver
            ? 'border-emerald-600 bg-emerald-50/50 scale-[1.005]'
            : 'border-dashed border-slate-300 hover:border-emerald-600/80 bg-slate-50/60 hover:bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3.5">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {uploadStage || 'Processing Dataset...'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                FastAPI Profiling & MongoDB Persistence
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress || 65}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-700">
              {uploadProgress}%
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center group-hover:border-emerald-400 group-hover:scale-105 transition duration-200">
              <UploadCloud className="w-7 h-7 text-emerald-700" />
            </div>

            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-900">
                Drag and drop your dataset here, or{' '}
                <span className="text-emerald-700 underline underline-offset-4 decoration-emerald-300 hover:text-emerald-800">
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports <span className="font-semibold text-slate-700">CSV, Excel (.xlsx, .xls)</span> up to 50MB
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600 font-medium shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Automatic Pandas schema detection & statistical profiling</span>
            </div>
          </div>
        )}
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1-Click Sample Datasets for Fast Testing */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Or Choose A Sample Dataset (Instant 1-Click Load)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Ready for live profiling</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sampleDatasets.map((sample) => (
            <button
              key={sample.id}
              onClick={() => !isUploading && handleLoadSample(sample)}
              disabled={isUploading}
              className="text-left p-3.5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-emerald-300 transition duration-150 group cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {sample.tag}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition">
                {sample.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
