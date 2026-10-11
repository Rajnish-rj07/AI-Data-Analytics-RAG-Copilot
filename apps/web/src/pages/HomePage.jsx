import React, { useState, useEffect } from 'react'
import {
  Table,
  Plus,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Wand2,
  LineChart,
  Bot,
  FileText,
  ArrowRight,
  Trash2,
  Layers,
  FolderOpen,
} from 'lucide-react'

import AppLayout from '../components/AppLayout'
import FileUploadZone from '../components/FileUploadZone'
import MetricsRow from '../components/MetricsRow'
import DataPreviewTable from '../components/DataPreviewTable'
import ColumnProfiler from '../components/ColumnProfiler'
import DataQualityBanner from '../components/DataQualityBanner'
import DatasetHistoryDrawer from '../components/DatasetHistoryDrawer'
import DeepProfileDashboard from '../components/DeepProfileDashboard'
import CleaningAssistant from '../components/CleaningAssistant'
import EdaStudio from '../components/EdaStudio'
import RagCopilot from '../components/RagCopilot'
import ReportViewer from '../components/ReportViewer'
import { datasetsApi, healthApi } from '../services/api'

export default function HomePage() {
  const [activeDataset, setActiveDataset] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('')
  const [uploadError, setUploadError] = useState('')

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ai_da_active_tab') || 'overview')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [savedDatasets, setSavedDatasets] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // System Health state
  const [_healthStatus, setHealthStatus] = useState({
    api: 'ok',
    ai: 'ok',
    database: 'ok',
    timestamp: '',
  })

  // Global Toast Alert State
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  // Sync activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('ai_da_active_tab', activeTab)
  }, [activeTab])

  // Load datasets on mount and restore previous active dataset
  const loadSavedDatasets = async (shouldRestore = true) => {
    setIsLoadingHistory(true)
    try {
      const res = await datasetsApi.getAll()
      if (res.success && res.datasets) {
        setSavedDatasets(res.datasets)
        if (shouldRestore && res.datasets.length > 0) {
          const storedId = localStorage.getItem('ai_da_active_dataset_id')
          const target = storedId
            ? res.datasets.find((d) => (d._id || d.id) === storedId)
            : res.datasets[0]
          if (target) {
            handleSelectDataset(target._id || target.id, false)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dataset history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const checkHealth = async () => {
    try {
      const data = await healthApi.getHealth()
      setHealthStatus({
        api: data.services?.api || 'ok',
        ai: data.services?.ai || 'error',
        database: data.services?.database || 'disconnected',
        timestamp: data.timestamp || new Date().toISOString(),
      })
    } catch {
      setHealthStatus({
        api: 'error',
        ai: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      })
    }
  }

  useEffect(() => {
    loadSavedDatasets(true)
    checkHealth()
  }, [])

  // Handle uploading a file
  const handleFileUpload = async (file) => {
    setIsUploading(true)
    setUploadProgress(15)
    setUploadStage('Uploading file to Node.js gateway...')
    setUploadError('')

    try {
      setTimeout(() => {
        setUploadProgress(45)
        setUploadStage('FastAPI validating & profiling columns...')
      }, 500)

      setTimeout(() => {
        setUploadProgress(80)
        setUploadStage('Storing metadata in MongoDB Atlas...')
      }, 1000)

      const res = await datasetsApi.uploadDataset(file, (p) => {
        setUploadProgress(Math.min(p, 90))
      })

      if (res.success && res.dataset) {
        setUploadProgress(100)
        setUploadStage('Complete!')
        setActiveDataset(res.dataset)
        const newId = res.dataset._id || res.dataset.id
        localStorage.setItem('ai_da_active_dataset_id', newId)
        setActiveTab('preview')
        setShowUploadModal(false)
        loadSavedDatasets(false)
        showToast(`Dataset "${res.dataset.originalName}" uploaded & profiled!`, 'success')
      } else {
        throw new Error(res.message || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload Error:', err)
      const msg = err.response?.data?.message || err.message || 'Error uploading file'
      setUploadError(msg)
      showToast(msg, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle 1-click loading the verified demo dataset
  const handleLoadDemo = async () => {
    setIsUploading(true)
    setUploadProgress(20)
    setUploadStage('Fetching verified demo sales dataset...')
    setUploadError('')
    try {
      const res = await fetch('/demo_sales.csv')
      if (!res.ok) throw new Error('Could not load demo file from server')
      const blob = await res.blob()
      const file = new File([blob], 'demo_ecommerce_sales.csv', { type: 'text/csv' })
      await handleFileUpload(file)
    } catch (err) {
      console.error('Demo loading error:', err)
      setUploadError(err.message || 'Failed to load demo dataset')
      showToast('Failed to load demo dataset', 'error')
      setIsUploading(false)
    }
  }

  // Handle selecting a saved dataset
  const handleSelectDataset = async (id, notify = true) => {
    try {
      const res = await datasetsApi.getById(id)
      if (res.success && res.dataset) {
        setActiveDataset(res.dataset)
        localStorage.setItem('ai_da_active_dataset_id', id)
        if (notify) {
          showToast(`Active dataset switched to "${res.dataset.originalName}"`, 'info')
        }
      }
    } catch (err) {
      console.error('Failed to load dataset:', err)
      showToast('Could not load dataset details.', 'error')
    }
  }

  // Handle deleting a dataset
  const handleDeleteDataset = async (id) => {
    try {
      await datasetsApi.deleteById(id)
      setSavedDatasets((prev) => prev.filter((d) => (d._id || d.id) !== id))
      if (activeDataset && (activeDataset.id === id || activeDataset._id === id)) {
        setActiveDataset(null)
        localStorage.removeItem('ai_da_active_dataset_id')
        setActiveTab('overview')
      }
      showToast('Dataset deleted and storage purged.', 'info')
    } catch (err) {
      console.error('Failed to delete dataset:', err)
      showToast('Failed to delete dataset.', 'error')
    }
  }

  // Workflow steps for analytical journey navigation
  const workflowSteps = [
    { id: 'overview', label: '1. Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'preview', label: '2. Inspect', icon: <Table className="w-3.5 h-3.5" /> },
    { id: 'clean', label: '3. Hygiene & Clean', icon: <Wand2 className="w-3.5 h-3.5" /> },
    { id: 'eda', label: '4. EDA Studio', icon: <LineChart className="w-3.5 h-3.5" /> },
    { id: 'rag', label: '5. AI Assistant', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'report', label: '6. BI Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ]

  return (
    <AppLayout
      activeDataset={activeDataset}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onUploadClick={() => setShowUploadModal(true)}
      onLoadDemo={handleLoadDemo}
      onOpenHistory={() => setIsHistoryOpen(true)}
      historyCount={savedDatasets.length}
    >
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError('')}
            className="text-rose-600 hover:text-rose-800 font-semibold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── ACTIVE DATASET SUB-HEADER BAR (shown whenever a dataset is loaded) ── */}
      {activeDataset && (
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  {activeDataset.originalName}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activeDataset.fileType}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {activeDataset.summary?.rowCount?.toLocaleString() || 0} rows • {activeDataset.columns?.length || 0} columns • {activeDataset.fileSizeKb} KB
              </p>
            </div>
          </div>

          {/* Quick dataset switcher & actions */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {savedDatasets.length > 1 && (
              <select
                value={activeDataset._id || activeDataset.id}
                onChange={(e) => handleSelectDataset(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                title="Switch active dataset"
              >
                {savedDatasets.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.originalName} ({d.summary?.rowCount?.toLocaleString() || 0} rows)
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Another</span>
            </button>

            <button
              onClick={() => {
                setActiveDataset(null)
                localStorage.removeItem('ai_da_active_dataset_id')
                setActiveTab('overview')
                showToast('Returned to Workspace Hub.', 'info')
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer"
              title="Close dataset and return to overview"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 1: OVERVIEW & HUB ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {!activeDataset ? (
            /* Hub View when NO dataset is active */
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden">
                <div className="max-w-3xl space-y-3.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Automated Full-Stack Analytics Engine</span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    Transform Raw Datasets into <br />
                    <span className="text-emerald-700">Verified Analytical Intelligence</span>
                  </h1>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    Upload your CSV or Excel dataset to automate schema profiling, data cleaning, exploratory analysis, and AI insights. Fully backed by Python Pandas, FastAPI compute, MongoDB Atlas, and ChromaDB vector search.
                  </p>

                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={handleLoadDemo}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Load Demo Sales Dataset</span>
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
                    >
                      <Plus className="w-4 h-4 text-slate-500" />
                      <span>Choose Custom File</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Zone Component */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <FileUploadZone
                  onUploadSuccess={handleFileUpload}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadStage={uploadStage}
                />
              </div>

              {/* Real Saved Datasets Table */}
              {savedDatasets.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-emerald-600" />
                        <span>Recently Uploaded Datasets</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Persisted in MongoDB Atlas with computed metadata.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {savedDatasets.length} {savedDatasets.length === 1 ? 'dataset' : 'datasets'} available
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10.5px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Dataset Name</th>
                          <th className="px-4 py-3">Format</th>
                          <th className="px-4 py-3 text-right">Rows</th>
                          <th className="px-4 py-3 text-right">Cols</th>
                          <th className="px-4 py-3 text-right">Size</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {savedDatasets.map((d) => {
                          const colCount = d.summary?.columnCount ?? d.columnNames?.length ?? d.columns?.length ?? 0
                          const rowCount = d.summary?.rowCount ?? 0

                          return (
                            <tr key={d._id || d.id} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-xs">{d.originalName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {d.fileType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 font-medium">
                                {rowCount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 font-medium">
                                {colCount}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600 text-[11px]">
                                {d.fileSizeKb ? `${d.fileSizeKb} KB` : 'N/A'}
                              </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    handleSelectDataset(d._id || d.id)
                                    setActiveTab('preview')
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
                                >
                                  Open
                                </button>
                                <button
                                  onClick={() => handleDeleteDataset(d._id || d.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete dataset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                            )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Hub View when ACTIVE dataset exists */
            <div className="space-y-6">
              {/* Analytical Journey Stepper */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Analytical Workflow Stepper
                  </span>
                  <span className="text-xs text-slate-500">
                    Click any step to inspect or execute
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {workflowSteps.map((step) => {
                    const isCurrent = activeTab === step.id
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveTab(step.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className={isCurrent ? 'text-emerald-700' : 'text-slate-400'}>
                          {step.icon}
                        </span>
                        <span className="truncate">{step.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* KPI Metrics Row */}
              <MetricsRow dataset={activeDataset} />

              {/* Quality Summary Banner */}
              <DataQualityBanner dataset={activeDataset} />

              {/* Quick Launch Cards for Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab('preview')}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Table className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Data Preview & Columns</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Examine row samples, verify inferred data types, and check column cardinality.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('clean')}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Data Quality & Cleaning</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Impute missing values, drop duplicates, and generate cleaned CSV export.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('eda')}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <LineChart className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">EDA Studio & Charts</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automated multi-chart distributions, correlation matrix, and custom builders.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('rag')}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">AI Data Assistant (RAG)</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Conversational queries grounded in exact Pandas statistical metrics and ChromaDB chunks.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('report')}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Executive BI Reports</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Power BI-grade report builder with standalone HTML, PDF, and CSV offline exports.
                  </p>
                </div>

                <div
                  onClick={() => setShowUploadModal(true)}
                  className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-400 shadow-2xs hover:bg-slate-100/70 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-600 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Upload New Dataset</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Process another CSV or Excel file alongside this one.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DATA PREVIEW TABLE ───────────────────────────────────── */}
      {activeTab === 'preview' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Displaying sample rows processed and validated by Python FastAPI.</span>
            <span className="font-mono text-[11px] text-slate-400">Live MongoDB Document</span>
          </div>
          <DataPreviewTable dataset={activeDataset} />
        </div>
      )}

      {/* ── TAB 3: COLUMN PROFILER ──────────────────────────────────────── */}
      {activeTab === 'profiler' && activeDataset && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 px-1">
            Statistical summary for all {activeDataset.columns?.length || 0} columns calculated via Pandas.
          </div>
          <ColumnProfiler columns={activeDataset.columns || []} />
        </div>
      )}

      {/* ── TAB 4: HYGIENE & DEEP AUDIT ─────────────────────────────────── */}
      {activeTab === 'deepprofile' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Correlation matrix, distribution histograms, IQR outlier detection, and automated insights powered by Pandas & SciPy.
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">Statistical Audit</span>
          </div>
          <DeepProfileDashboard dataset={activeDataset} />
        </div>
      )}

      {/* ── TAB 5: CLEANING STUDIO ──────────────────────────────────────── */}
      {activeTab === 'clean' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Review AI-generated cleaning plan, configure imputation strategies per column, and download cleaned data. Your original file is untouched.
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">Cleaning Engine</span>
          </div>
          <CleaningAssistant dataset={activeDataset} />
        </div>
      )}

      {/* ── TAB 6: EDA STUDIO ───────────────────────────────────────────── */}
      {activeTab === 'eda' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Automated visual discovery, dynamic multi-dimensional charts, and mathematical insights powered by Pandas & Recharts.
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">EDA Engine</span>
          </div>
          <EdaStudio dataset={activeDataset} />
        </div>
      )}

      {/* ── TAB 7: AI DATA ASSISTANT (RAG) ──────────────────────────────── */}
      {activeTab === 'rag' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Conversational intelligence & Q&A backed by ChromaDB vector store and Python statistical truth.
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">RAG Copilot</span>
          </div>
          <RagCopilot dataset={activeDataset} />
        </div>
      )}

      {/* ── TAB 8: BI REPORTS STUDIO ────────────────────────────────────── */}
      {activeTab === 'report' && activeDataset && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 print:hidden">
            <span>
              Comprehensive Business Intelligence report distinguishing calculated Pandas facts, AI insights, and actionable recommendations.
            </span>
            <span className="font-mono text-[11px] text-emerald-700 font-semibold">BI Reports Studio</span>
          </div>
          <ReportViewer dataset={activeDataset} />
        </div>
      )}

      {/* ── UPLOAD MODAL ────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Dataset</h3>
                <p className="text-xs text-slate-500">CSV or Excel (up to 50MB)</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <FileUploadZone
              onUploadSuccess={handleFileUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              uploadStage={uploadStage}
            />
          </div>
        </div>
      )}

      {/* ── DATASET HISTORY DRAWER ─────────────────────────────────────── */}
      <DatasetHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        datasets={savedDatasets}
        activeDatasetId={activeDataset?._id || activeDataset?.id}
        onSelectDataset={handleSelectDataset}
        onDeleteDataset={handleDeleteDataset}
        isLoading={isLoadingHistory}
      />

      {/* ── GLOBAL SYSTEM TOAST ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl border shadow-lg flex items-center gap-2.5 text-xs font-semibold transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : toast.type === 'info'
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === 'error'
                  ? 'bg-rose-500'
                  : toast.type === 'info'
                  ? 'bg-sky-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </AppLayout>
  )
}