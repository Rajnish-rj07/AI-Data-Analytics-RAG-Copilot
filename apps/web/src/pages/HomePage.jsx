import React, { useState, useEffect } from 'react'
import {
  Table,
  BarChart2,
  Server,
  Plus,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Database,
  FlaskConical,
  Wand2,
  LineChart,
  Bot,
  FileText,
} from 'lucide-react'

import Navbar from '../components/Navbar'
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

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ai_da_active_tab') || 'preview')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [savedDatasets, setSavedDatasets] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // System Health state (for Phase 1 cluster tab)
  const [healthStatus, setHealthStatus] = useState({
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
            : null
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
        api: data.services?.api || 'error',
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
      }
      showToast('Dataset deleted and storage purged.', 'info')
    } catch (err) {
      console.error('Failed to delete dataset:', err)
      showToast('Failed to delete dataset.', 'error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        activeDataset={activeDataset}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={savedDatasets.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification if upload failed */}
        {uploadError && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError('')}
              className="text-red-400 hover:text-red-300 font-bold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW 1: HERO / UPLOAD (When no dataset is currently active) */}
        {!activeDataset ? (
          <div className="space-y-10 py-6">
            {/* Hero Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Data Analytics Platform</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Turn Raw Datasets into <br />
                <span className="gradient-text">Automated Intelligence</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Upload your CSV or Excel file. Our FastAPI compute engine validates schema, infers data types, calculates statistics, and stores metadata in your MongoDB Atlas cluster.
              </p>
            </div>

            {/* Drop Zone & Sample Datasets */}
            <div className="max-w-3xl mx-auto">
              <FileUploadZone
                onUploadSuccess={handleFileUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadStage={uploadStage}
              />
            </div>

            {/* Quick Feature Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl glass-panel bg-slate-900/40 border-slate-800/80 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Table className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200">Pandas Engine Profiling</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatic data type inference, null detection, distribution statistics, and clean preview serialization.
                </p>
              </div>

              <div className="p-4 rounded-xl glass-panel bg-slate-900/40 border-slate-800/80 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200">MongoDB Atlas Cloud</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Secure metadata & summary caching in your Atlas cluster for sub-millisecond retrieval and historical recall.
                </p>
              </div>

              <div className="p-4 rounded-xl glass-panel bg-slate-900/40 border-slate-800/80 space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200">Roadmap Ready</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Built to feed seamlessly into automated cleaning (Phase 4), EDA charts (Phase 5), and RAG analytics (Phase 6).
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: ACTIVE DATASET DASHBOARD */
          <div className="space-y-6">
            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      {activeDataset.originalName}
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                      {activeDataset.fileType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeDataset.summary?.rowCount?.toLocaleString() || 0} rows • {activeDataset.columns?.length || 0} columns • {activeDataset.fileSizeKb} KB
                  </p>
                </div>
              </div>

              {/* Action Controls & Dataset Switcher */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {savedDatasets.length > 1 && (
                  <select
                    value={activeDataset._id || activeDataset.id}
                    onChange={(e) => handleSelectDataset(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
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
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>

                <button
                  onClick={() => {
                    setActiveDataset(null)
                    localStorage.removeItem('ai_da_active_dataset_id')
                    showToast('Returned to home upload screen.', 'info')
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close active dataset and return to upload screen"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Metrics Row (5 Cards) */}
            <MetricsRow dataset={activeDataset} />

            {/* Quality Summary Banner */}
            <DataQualityBanner dataset={activeDataset} />

            {/* Tab Navigation */}
            <div className="border-b border-white/5 flex items-center gap-1 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'preview'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Data Preview</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {activeDataset.preview?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('profiler')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'profiler'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Column Profiling</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {activeDataset.columns?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('deepprofile')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'deepprofile'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Deep Analytics</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 uppercase tracking-wider">
                  Phase 3
                </span>
              </button>

              <button
                onClick={() => setActiveTab('clean')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'clean'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>Clean Data</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 uppercase tracking-wider">
                  Phase 4
                </span>
              </button>

              <button
                onClick={() => setActiveTab('eda')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'eda'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span>EDA Studio</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/25 uppercase tracking-wider">
                  Phase 5
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rag')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'rag'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>RAG Copilot</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 uppercase tracking-wider">
                  Phase 6
                </span>
              </button>

              <button
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>BI Reports</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 uppercase tracking-wider">
                  Phase 7
                </span>
              </button>

              <button
                onClick={() => setActiveTab('health')}
                className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'health'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Cluster Health</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </button>
            </div>

            {/* Tab 1: Data Preview Table */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Displaying initial sample rows processed and validated by Python FastAPI.</span>
                  <span className="font-mono text-[11px] text-slate-500">Live MongoDB Document</span>
                </div>
                <DataPreviewTable dataset={activeDataset} />
              </div>
            )}

            {/* Tab 2: Column Profiler */}
            {activeTab === 'profiler' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 px-1">
                  Statistical summary for all {activeDataset.columns?.length || 0} columns calculated via Pandas.
                </div>
                <ColumnProfiler columns={activeDataset.columns || []} />
              </div>
            )}

            {/* Tab 3: Phase 3 Deep Analytics */}
            {activeTab === 'deepprofile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Correlation matrix, distribution histograms, IQR outlier detection, and automated insights
                    powered by Pandas + SciPy.
                  </span>
                  <span className="font-mono text-[11px] text-cyan-500">Phase 3 Engine</span>
                </div>
                <DeepProfileDashboard dataset={activeDataset} />
              </div>
            )}

            {/* Tab 4: Phase 4 Data Cleaning */}
            {activeTab === 'clean' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Review AI-generated cleaning plan, adjust strategies per column, confirm, and download a clean CSV.
                    Your original file is never modified.
                  </span>
                  <span className="font-mono text-[11px] text-emerald-500">Phase 4 Engine</span>
                </div>
                <CleaningAssistant dataset={activeDataset} />
              </div>
            )}

            {/* Tab 5: Phase 5 Automated EDA Studio */}
            {activeTab === 'eda' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Automated visual discovery, dynamic multi-dimensional charts, and mathematical insights powered by Pandas & Recharts.
                  </span>
                  <span className="font-mono text-[11px] text-purple-400">Phase 5 EDA Engine</span>
                </div>
                <EdaStudio dataset={activeDataset} />
              </div>
            )}

            {/* Tab 6: Phase 6 RAG Copilot */}
            {activeTab === 'rag' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Semantic conversational intelligence & Q&A backed by ChromaDB vector store and Python statistical truth.
                  </span>
                  <span className="font-mono text-[11px] text-indigo-400">Phase 6 RAG Engine</span>
                </div>
                <RagCopilot dataset={activeDataset} />
              </div>
            )}

            {/* Tab 7: Phase 7 BI Reports */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1 print:hidden">
                  <span>
                    Comprehensive Business Intelligence report distinguishing calculated Pandas facts, AI insights, and actionable recommendations.
                  </span>
                  <span className="font-mono text-[11px] text-indigo-400">Phase 7 BI Engine</span>
                </div>
                <ReportViewer dataset={activeDataset} />
              </div>
            )}

            {/* Tab 6: System Cluster Health (Phase 1 Confirmation) */}
            {activeTab === 'health' && (
              <div className="p-6 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Full Stack Architecture Health</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All four nodes communicating via local loopback & cloud cluster.
                    </p>
                  </div>
                  <button
                    onClick={checkHealth}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ping Services</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-xs font-semibold text-slate-400">React Frontend</span>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                      Online
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">http://localhost:5173</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-xs font-semibold text-slate-400">Node.js Express API</span>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                      {healthStatus.api === 'ok' ? 'Healthy' : 'Error'}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">http://localhost:3001</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-xs font-semibold text-slate-400">MongoDB Atlas</span>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                      {healthStatus.database === 'ok' ? 'Connected' : 'Disconnected'}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">Cloud Cluster (AWS)</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-xs font-semibold text-slate-400">Python FastAPI</span>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                      {healthStatus.ai === 'ok' ? 'Running' : 'Unreachable'}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">http://localhost:8000</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal (when replacing/adding new dataset) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f1629] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Upload New Dataset</h3>
                <p className="text-xs text-slate-400">CSV or Excel (up to 50MB)</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
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

      {/* Dataset History Slide-over Drawer */}
      <DatasetHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        datasets={savedDatasets}
        activeDatasetId={activeDataset?._id || activeDataset?.id}
        onSelectDataset={handleSelectDataset}
        onDeleteDataset={handleDeleteDataset}
        isLoading={isLoadingHistory}
      />

      {/* Floating System Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-2xl glass-panel border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold transition-all ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : toast.type === 'info'
                ? 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
                : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === 'error'
                  ? 'bg-rose-400'
                  : toast.type === 'info'
                  ? 'bg-indigo-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}