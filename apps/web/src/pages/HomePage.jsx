import { useState, useEffect } from 'react'

function StatusBadge({ label, status, detail }) {
  const colors = {
    ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    loading: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${colors[status]}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs font-mono opacity-80">{detail}</span>
    </div>
  )
}

function HomePage() {
  const [apiStatus, setApiStatus] = useState({ status: 'loading', message: 'Checking...' })
  const [aiStatus, setAiStatus] = useState({ status: 'loading', message: 'Checking...' })

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((data) => {
        setApiStatus({ status: 'ok', message: data.message || 'Connected' })
        if (data.services?.ai === 'ok') {
          setAiStatus({ status: 'ok', message: 'Connected via Node' })
        } else {
          setAiStatus({ status: 'error', message: 'Unreachable' })
        }
      })
      .catch(() => {
        setApiStatus({ status: 'error', message: 'Unreachable — is Node running?' })
        setAiStatus({ status: 'error', message: 'Unknown (Node unreachable)' })
      })
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Logo / Title */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            AI Data Analytics Copilot
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Phase 1 — Foundation • All three services should show green below
        </p>
      </div>

      {/* Service Status Card */}
      <div
        className="w-full max-w-md rounded-2xl p-6 border"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Service Health
        </h2>
        <div className="flex flex-col gap-3">
          <StatusBadge label="React Frontend" status="ok" detail="localhost:5173" />
          <StatusBadge label="Node.js API" status={apiStatus.status} detail={apiStatus.message} />
          <StatusBadge label="Python FastAPI" status={aiStatus.status} detail={aiStatus.message} />
        </div>
      </div>

      {/* Phase info */}
      <p className="mt-8 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Phase 1 complete — Phase 2 will replace this with the Project Dashboard
      </p>
    </div>
  )
}

export default HomePage