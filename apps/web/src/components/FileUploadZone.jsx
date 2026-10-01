import React, { useState, useRef } from 'react'
import { UploadCloud, ArrowUpRight, AlertCircle, Loader2, Sparkles } from 'lucide-react'
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
      setErrorMessage(`Unsupported file format (${ext}). Please upload a .CSV or .XLSX file.`)
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
      {/* Upload Drop Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative group rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer overflow-hidden border-2 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/[0.08] shadow-[0_0_40px_rgba(99,102,241,0.25)] scale-[1.01]'
            : 'border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/60 hover:bg-slate-900/90'
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

        {/* Ambient background glow */}
        <div className="absolute inset-0 -z-10 bg-radial from-indigo-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500" />

        {isUploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-100">
                {uploadStage || 'Processing Dataset...'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                FastAPI Profiling & MongoDB Persistence
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden mt-3 border border-slate-700/60">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-300"
                style={{ width: `${uploadProgress || 65}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-indigo-400">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition duration-300 shadow-lg shadow-indigo-500/10">
              <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:text-cyan-300 transition" />
            </div>

            <div>
              <p className="text-lg font-semibold text-slate-100 group-hover:text-white transition">
                Drag & Drop your dataset here, or <span className="text-indigo-400 underline decoration-indigo-400/50 underline-offset-4">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Supports <span className="font-semibold text-slate-300">CSV, Excel (.xlsx, .xls)</span> up to 50MB
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Instant AI Column Typing & Statistical Profiling</span>
            </div>
          </div>
        )}
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1-Click Sample Datasets */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Or Try A Sample Dataset (1-Click Instant Test)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Ready to profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sampleDatasets.map((sample) => (
            <button
              key={sample.id}
              onClick={() => !isUploading && handleLoadSample(sample)}
              disabled={isUploading}
              className="text-left p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {sample.tag}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                {sample.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
