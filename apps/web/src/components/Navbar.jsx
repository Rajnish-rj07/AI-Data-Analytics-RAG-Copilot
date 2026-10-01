import React, { useState, useEffect } from 'react'
import { Sparkles, Database, Server, Cpu, FolderOpen, RefreshCw } from 'lucide-react'
import { healthApi } from '../services/api'

export default function Navbar({ activeDataset, onOpenHistory, historyCount }) {
  const [health, setHealth] = useState({ api: 'loading', ai: 'loading', database: 'loading' })
  const [showHealthModal, setShowHealthModal] = useState(false)

  const checkHealth = async () => {
    try {
      const data = await healthApi.getHealth()
      setHealth({
        api: data.services?.api || 'ok',
        ai: data.services?.ai || 'error',
        database: data.services?.database || 'disconnected',
      })
    } catch {
      setHealth({ api: 'error', ai: 'error', database: 'disconnected' })
    }
  }


  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  const allHealthy = health.api === 'ok' && health.ai === 'ok' && health.database === 'ok'

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 bg-[#090d16]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">AI Data Analytics</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Copilot
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Phase 2 • Dataset Ingestion & Profiling</p>
          </div>
        </div>

        {/* Center: Current active dataset title */}
        {activeDataset && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Active Dataset:</span>
            <span className="font-semibold text-slate-200 max-w-[200px] truncate">{activeDataset.originalName}</span>
            <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {activeDataset.fileType}
            </span>
          </div>
        )}

        {/* Right Actions: History + Health Pill */}
        <div className="flex items-center gap-3">
          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-200 text-xs font-medium transition cursor-pointer"
            title="View saved datasets in MongoDB Atlas"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Saved Datasets</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-mono">
                {historyCount}
              </span>
            )}
          </button>

          {/* Health status badge */}
          <div className="relative">
            <button
              onClick={() => setShowHealthModal(!showHealthModal)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                allHealthy
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  allHealthy ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              ></span>
              <span className="hidden sm:inline">{allHealthy ? 'All Systems Online' : 'Check Services'}</span>
            </button>

            {/* Health Popup Modal */}
            {showHealthModal && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl p-4 glass-panel bg-[#111827]/95 border border-slate-700/80 shadow-2xl z-50">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Service Cluster</span>
                  <button
                    onClick={checkHealth}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title="Refresh Status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      Node.js API (3001)
                    </span>
                    <span className={`font-mono text-[11px] ${health.api === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {health.api}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      MongoDB Atlas
                    </span>
                    <span className={`font-mono text-[11px] ${health.database === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {health.database}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-300">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Python FastAPI (8000)
                    </span>
                    <span className={`font-mono text-[11px] ${health.ai === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {health.ai}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
