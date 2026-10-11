import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Table,
  BarChart2,
  ShieldCheck,
  Wand2,
  LineChart,
  Bot,
  FileText,
  FolderOpen,
  Server,
  RefreshCw,
  Plus,
  ChevronRight,
  Menu,
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { healthApi } from '../services/api'

export default function AppLayout({
  activeDataset,
  activeTab,
  onTabChange,
  onUploadClick,
  onLoadDemo,
  onOpenHistory,
  historyCount = 0,
  children,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [health, setHealth] = useState({ api: 'loading', ai: 'loading', database: 'loading' })
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false)

  const checkHealth = async () => {
    setIsRefreshingHealth(true)
    try {
      const data = await healthApi.getHealth()
      setHealth({
        api: data.services?.api || 'ok',
        ai: data.services?.ai || 'error',
        database: data.services?.database || 'disconnected',
      })
    } catch {
      setHealth({ api: 'error', ai: 'error', database: 'disconnected' })
    } finally {
      setIsRefreshingHealth(false)
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 20000)
    return () => clearInterval(interval)
  }, [])

  const allHealthy = health.api === 'ok' && health.ai === 'ok' && health.database === 'ok'

  // Navigation Items Grouped by Analytical Journey
  const navGroups = [
    {
      group: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview & Hub', icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          id: 'datasets',
          label: 'Dataset Repository',
          icon: <FolderOpen className="w-4 h-4" />,
          badge: historyCount > 0 ? historyCount : undefined,
          action: onOpenHistory,
        },
      ],
    },
    {
      group: 'Data Pipeline',
      items: [
        { id: 'preview', label: 'Data Preview', icon: <Table className="w-4 h-4" />, requiresDataset: true },
        { id: 'profiler', label: 'Column Profiler', icon: <BarChart2 className="w-4 h-4" />, requiresDataset: true },
        { id: 'deepprofile', label: 'Hygiene & Deep Audit', icon: <ShieldCheck className="w-4 h-4" />, requiresDataset: true },
        { id: 'clean', label: 'Cleaning Studio', icon: <Wand2 className="w-4 h-4" />, requiresDataset: true },
      ],
    },
    {
      group: 'Analytics & AI',
      items: [
        { id: 'eda', label: 'Exploratory Studio', icon: <LineChart className="w-4 h-4" />, requiresDataset: true },
        { id: 'rag', label: 'AI Data Assistant', icon: <Bot className="w-4 h-4" />, requiresDataset: true },
      ],
    },
    {
      group: 'Deliverables',
      items: [
        { id: 'report', label: 'BI Reports Studio', icon: <FileText className="w-4 h-4" />, requiresDataset: true },
      ],
    },
  ]

  // Map active tab to human-readable label for breadcrumb
  const getTabLabel = (id) => {
    for (const grp of navGroups) {
      const match = grp.items.find((i) => i.id === id)
      if (match) return match.label
    }
    return 'Workspace'
  }

  const handleNavClick = (item) => {
    if (item.action) {
      item.action()
      setIsMobileMenuOpen(false)
      return
    }
    if (item.requiresDataset && !activeDataset) {
      // Stay on overview or switch to overview if no dataset
      onTabChange('overview')
    } else {
      onTabChange(item.id)
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* ── TOP HEADER / APP BAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-hidden whitespace-nowrap">
            <span
              onClick={() => onTabChange('overview')}
              className="text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              Workspace
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {activeDataset ? (
              <>
                <span className="font-semibold text-slate-800 max-w-[160px] sm:max-w-[220px] truncate">
                  {activeDataset.originalName}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-emerald-700 font-semibold">{getTabLabel(activeTab)}</span>
              </>
            ) : (
              <span className="text-slate-700 font-semibold">Overview & Hub</span>
            )}
          </nav>
        </div>

        {/* Right: Quick Demo, Upload button, Health monitor */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Dataset Button */}
          {onLoadDemo && !activeDataset && (
            <button
              onClick={onLoadDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-xs font-semibold text-emerald-800 transition cursor-pointer shadow-xs"
              title="Instantly load sample eCommerce sales dataset"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Load Demo Data</span>
            </button>
          )}

          {/* Upload Button */}
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Dataset</span>
          </button>

          {/* Health Monitor Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowHealthModal(!showHealthModal)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                allHealthy
                  ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="System Cluster Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  allHealthy ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="hidden md:inline font-medium">
                {allHealthy ? 'Systems Online' : 'Check Cluster'}
              </span>
            </button>

            {/* Health Popover */}
            {showHealthModal && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 p-4 shadow-xl z-50 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                    Service Status
                  </span>
                  <button
                    onClick={checkHealth}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 transition"
                    title="Refresh Status"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Server className="w-3.5 h-3.5 text-slate-500" />
                      Node.js Gateway (:3001)
                    </span>
                    <span className={`font-mono text-[11px] font-semibold ${health.api === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {health.api}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Database className="w-3.5 h-3.5 text-slate-500" />
                      MongoDB Atlas
                    </span>
                    <span className={`font-mono text-[11px] font-semibold ${health.database === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {health.database}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      FastAPI Analytics (:8000)
                    </span>
                    <span className={`font-mono text-[11px] font-semibold ${health.ai === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {health.ai}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTAINER WITH SIDEBAR ────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── PERSISTENT LEFT SIDEBAR ──────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand Header */}
          <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                  AI Data Copilot
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Enterprise Analytics v1.0</span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1">
                <h4 className="px-3 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {grp.group}
                </h4>
                {grp.items.map((item) => {
                  const isActive = activeTab === item.id
                  const isDisabled = item.requiresDataset && !activeDataset

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border-l-2 border-emerald-600 shadow-2xs'
                          : isDisabled
                          ? 'text-slate-400 opacity-50 cursor-not-allowed hover:bg-transparent'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={isActive ? 'text-emerald-700' : 'text-slate-500'}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Active Dataset Status Widget in Sidebar Bottom */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            {activeDataset ? (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Active Dataset
                  </span>
                  <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {activeDataset.fileType}
                  </span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 truncate" title={activeDataset.originalName}>
                    {activeDataset.originalName}
                  </h5>
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                    {(activeDataset.summary?.rowCount ?? 0).toLocaleString()} rows • {activeDataset.summary?.columnCount ?? activeDataset.columns?.length ?? activeDataset.columnNames?.length ?? 0} cols
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white border border-dashed border-slate-200 text-center space-y-1">
                <p className="text-[11px] font-semibold text-slate-600">No dataset loaded</p>
                <p className="text-[10px] text-slate-500">Upload or select a file to enable analytics</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN WORKSPACE CONTENT ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
