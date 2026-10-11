import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  FileText,
  Printer,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Target,
  FileCode,
  Zap,
  SlidersHorizontal,
  Settings2,
  PieChart as PieIcon,
  Award,
  ChevronDown,
  Eye,
  Filter,
  X,
  Plus,
  Table as TableIcon,
  Activity,
  User,
} from 'lucide-react'
import { datasetsApi } from '../services/api'

const PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6',
  '#f97316', '#a855f7'
]

// Custom Tooltip for Recharts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-50">
      {label && <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#6366f1' }}
            />
            <span className="text-slate-400 capitalize">{entry.name || 'Value'}:</span>
          </div>
          <span className="font-mono font-bold text-slate-100">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ReportViewer({ dataset }) {
  const datasetId = dataset?.id || dataset?._id

  // Report payload state
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('canvas') // canvas | briefing | insights | markdown
  const [copied, setCopied] = useState(false)

  // Power BI Studio Slicers State
  const [selectedDimension, setSelectedDimension] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL')
  const [metricViewMode, setMetricViewMode] = useState('total') // 'total' | 'mean'

  // Report Designer State (Modal / Studio Customizer)
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)
  const [designerForm, setDesignerForm] = useState({
    title: '',
    subtitle: '',
    author: '',
    user_notes: '',
  })

  // Visible Widgets config
  const [widgets, setWidgets] = useState({
    kpiCards: true,
    segmentBar: true,
    marketShareDonut: true,
    trendArea: true,
    correlationCouplings: true,
    matrixTable: true,
    recommendations: true,
  })

  // Fetch / Generate Report
  const handleGenerate = async (customConfig = {}) => {
    if (!datasetId || loading) return
    setLoading(true)
    setError('')
    try {
      const payload = {
        title: customConfig.title ?? (designerForm.title || undefined),
        subtitle: customConfig.subtitle ?? (designerForm.subtitle || undefined),
        author: customConfig.author ?? (designerForm.author || undefined),
        user_notes: customConfig.user_notes ?? (designerForm.user_notes || undefined),
        primary_metric: customConfig.primary_metric ?? (selectedMetric || undefined),
        primary_cat: customConfig.primary_cat ?? (selectedDimension || undefined),
      }
      const data = await datasetsApi.generateReport(datasetId, payload)
      if (data.success) {
        setReport(data)
        // Sync slicers if not yet selected
        if (!selectedDimension && data.facts?.primary_cat) {
          setSelectedDimension(data.facts.primary_cat)
        }
        if (!selectedMetric && data.facts?.primary_metric) {
          setSelectedMetric(data.facts.primary_metric)
        }
        if (!designerForm.title && data.title) {
          setDesignerForm((prev) => ({
            ...prev,
            title: data.title,
            subtitle: data.subtitle || '',
            author: data.author || '',
            user_notes: data.user_notes || '',
          }))
        }
      } else {
        throw new Error(data.message || 'Report generation failed')
      }
    } catch (err) {
      console.error('Report Error:', err)
      setError(err.response?.data?.message || err.message || 'Could not generate report')
    } finally {
      setLoading(false)
    }
  }

  // Initial auto-generation
  useEffect(() => {
    if (datasetId && !report && !loading) {
      handleGenerate()
    }
  }, [datasetId])

  // Filtered segment data based on slicer
  const filteredSegments = useMemo(() => {
    if (!report?.facts?.segment_ranking) return []
    if (segmentFilter === 'ALL') return report.facts.segment_ranking
    return report.facts.segment_ranking.filter((s) => s.segment === segmentFilter)
  }, [report, segmentFilter])

  const chartSegments = useMemo(() => {
    if (!report?.chart_data?.segment_bar) return []
    if (segmentFilter === 'ALL') return report.chart_data.segment_bar
    return report.chart_data.segment_bar.filter((s) => s.name === segmentFilter)
  }, [report, segmentFilter])

  // Download Standalone Offline HTML Report
  const handleDownloadOfflineHTML = () => {
    if (!report) return
    const { facts, kpi_cards, chart_data, executive_summary, data_quality, key_insights, recommendations } = report

    // Construct SVG Bar Chart
    const barItems = chart_data?.segment_bar?.slice(0, 8) || []
    const maxVal = Math.max(...barItems.map((b) => b.total), 1)
    const barChartSVG = `
      <svg width="100%" height="240" viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a;border-radius:12px;padding:16px;">
        <text x="20" y="25" fill="#94a3b8" font-size="12" font-family="sans-serif">Segment Volume Breakdown (${facts.primary_metric})</text>
        ${barItems
          .map((item, idx) => {
            const barH = Math.max(8, (item.total / maxVal) * 140)
            const x = 50 + idx * 65
            const y = 190 - barH
            return `
              <rect x="${x}" y="${y}" width="42" height="${barH}" rx="4" fill="url(#gradBar)" />
              <text x="${x + 21}" y="205" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">${item.name.substring(0, 8)}</text>
              <text x="${x + 21}" y="${y - 6}" fill="#cbd5e1" font-size="9" text-anchor="middle" font-family="sans-serif">${item.share_pct}%</text>
            `
          })
          .join('')}
        <defs>
          <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#4f46e5"/>
          </linearGradient>
        </defs>
      </svg>
    `

    // Standalone HTML template with executive dark styling
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --border: #1f2937;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.2);
      --success: #10b981;
      --cyan: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); padding: 32px 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap; }
    .header h1 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .header p { font-size: 13px; color: var(--text-muted); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: var(--accent-glow); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .kpi-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 6px; }
    .kpi-val { font-size: 24px; font-weight: 800; font-family: monospace; color: #fff; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 12px; }
    th { padding: 10px 14px; color: var(--text-muted); border-bottom: 1px solid var(--border); font-weight: 600; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #e5e7eb; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .callout { background: rgba(99, 102, 241, 0.08); border-left: 4px solid var(--accent); padding: 14px; border-radius: 0 10px 10px 0; margin-bottom: 16px; font-size: 13px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .header, .card, .kpi-card { background: #fff; border: 1px solid #ccc; color: #000; }
      th, td, .kpi-val, .header h1, .card-title { color: #000 !important; }
      .badge { background: #eee; color: #000; border-color: #ccc; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span class="badge">Power BI Grade Report</span>
          <span style="font-size:12px;color:#10b981;font-weight:600;">● Grounded in Pandas Facts</span>
        </div>
        <h1>${report.title}</h1>
        <p>${report.subtitle || ''} • Prepared by: <strong>${report.author}</strong> • Generated: ${report.generated_at}</p>
      </div>
      <div>
        <span class="badge" style="font-size:13px;padding:8px 14px;background:rgba(16,185,129,0.1);color:#34d399;border-color:rgba(16,185,129,0.3);">
          Health Score: ${facts.health_score} / 100
        </span>
      </div>
    </div>

    ${report.user_notes ? `
    <div class="callout">
      <strong>Executive Directives & Goals:</strong><br/>
      ${report.user_notes}
    </div>` : ''}

    <div class="kpi-grid">
      ${kpi_cards
        .map(
          (kpi) => `
        <div class="kpi-card">
          <div class="kpi-title">${kpi.title}</div>
          <div class="kpi-val">${kpi.value}</div>
          <div class="kpi-sub">${kpi.subtitle}</div>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">📊 Visual Canvas: Segment Distribution</div>
        ${barChartSVG}
      </div>

      <div class="card">
        <div class="card-title">🎯 Executive Summary Verdict</div>
        <div class="callout">${executive_summary.verdict}</div>
        <p style="font-size:13px;color:#cbd5e1;line-height:1.6;">${executive_summary.narrative}</p>
        <ul style="margin-top:14px;padding-left:18px;font-size:12px;color:#94a3b8;">
          ${executive_summary.highlights.map((h) => `<li style="margin-bottom:4px;">${h}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🏆 Power BI Matrix Table: Segment Breakdown (${facts.primary_cat} by ${facts.primary_metric})</div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Segment (${facts.primary_cat})</th>
            <th>Total ${facts.primary_metric}</th>
            <th>Average Yield</th>
            <th>Record Count</th>
            <th>Market Share</th>
          </tr>
        </thead>
        <tbody>
          ${(facts.segment_ranking || [])
            .map(
              (seg, i) => `
            <tr>
              <td style="font-weight:700;color:#818cf8;">#${i + 1}</td>
              <td style="font-weight:600;color:#fff;">${seg.segment}</td>
              <td style="font-family:monospace;">${seg.total.toLocaleString()}</td>
              <td style="font-family:monospace;">${seg.mean.toLocaleString()}</td>
              <td style="font-family:monospace;">${seg.count}</td>
              <td><strong style="color:#38bdf8;">${seg.share_pct}%</strong></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">💡 Strategic Key Insights (Pandas Facts Grounded)</div>
        ${key_insights
          .map(
            (ins) => `
          <div style="margin-bottom:14px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);">
            <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;">${ins.badge} ${ins.title}</div>
            <div style="font-size:11px;font-family:monospace;color:#38bdf8;margin-bottom:4px;">[Fact]: ${ins.fact}</div>
            <div style="font-size:12px;color:#cbd5e1;">[Interpretation]: ${ins.explanation}</div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="card">
        <div class="card-title">🎯 Actionable Recommendations Roadmap</div>
        ${recommendations
          .map(
            (rec) => `
          <div style="margin-bottom:14px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong style="font-size:13px;color:#fff;">${rec.area}</strong>
              <span style="font-size:11px;color:#10b981;font-family:monospace;">Priority ${rec.priority}</span>
            </div>
            <p style="font-size:12px;color:#e2e8f0;margin-bottom:4px;"><strong>Action:</strong> ${rec.action}</p>
            <p style="font-size:11px;color:#94a3b8;"><strong>Expected Impact:</strong> ${rec.impact}</p>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div style="text-align:center;font-size:11px;color:var(--text-muted);padding:24px 0;">
      Generated by AI Data Analytics Copilot — Power BI Integrated BI Report Studio • Grounded with zero hallucination
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PowerBI_Report_${dataset?.originalName?.replace(/\.[^/.]+$/, '') || 'dataset'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Download Aggregated CSV
  const handleDownloadSummaryCSV = () => {
    if (!report?.facts?.segment_ranking?.length) return
    const headers = ['Rank', 'Segment', `Total_${report.facts.primary_metric}`, 'Mean_Average', 'Record_Count', 'Market_Share_Pct']
    const rows = report.facts.segment_ranking.map((s, idx) => [
      idx + 1,
      `"${s.segment.replace(/"/g, '""')}"`,
      s.total,
      s.mean,
      s.count,
      s.share_pct,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BI_Aggregation_${report.facts.primary_cat}_by_${report.facts.primary_metric}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadMarkdown = () => {
    if (!report?.markdown) return
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BI_Report_${dataset?.originalName?.replace(/\.[^/.]+$/, '') || 'dataset'}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadJSON = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BI_Report_${dataset?.originalName?.replace(/\.[^/.]+$/, '') || 'dataset'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyMarkdown = () => {
    if (!report?.markdown) return
    navigator.clipboard.writeText(report.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Handle Designer Form Submit
  const handleSaveDesigner = (e) => {
    e.preventDefault()
    setIsDesignerOpen(false)
    handleGenerate({
      title: designerForm.title,
      subtitle: designerForm.subtitle,
      author: designerForm.author,
      user_notes: designerForm.user_notes,
      primary_metric: selectedMetric,
      primary_cat: selectedDimension,
    })
  }

  if (loading && !report) {
    return (
      <div className="p-16 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-white">Synthesizing Power BI Studio Report...</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Profiling attributes, aggregating multi-dimensional segment volumes, calculating linear correlation couplings, and synthesizing executive narratives.
          </p>
        </div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-xs font-semibold">{error}</p>
        <button
          onClick={() => handleGenerate()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-16 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-xl shadow-indigo-500/10">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-white">Power BI Executive Report Studio</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate presentation-ready dashboards with interactive Recharts visuals, multi-row KPI tiles, sliceable dimensions, and downloadable standalone HTML/PDF reports.
          </p>
        </div>
        <button
          onClick={() => handleGenerate()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-xl shadow-indigo-500/25 transition cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Power BI Studio</span>
        </button>
      </div>
    )
  }

  const { facts, kpi_cards = [], chart_data = {}, executive_summary, data_quality, key_insights, recommendations } = report

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* POWER BI TOP RIBBON & ACTION HEADER                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="print:hidden p-5 rounded-2xl glass-panel bg-slate-900/70 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 text-white border border-indigo-400/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">{report.title}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse text-indigo-400" /> Live Studio
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Grounded in Pandas Facts
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              {report.author && (
                <span className="flex items-center gap-1 text-slate-300">
                  <User className="w-3 h-3 text-slate-500" /> {report.author}
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> {report.generated_at}
              </span>
              <span>•</span>
              <span className="font-mono text-indigo-300">{facts.filename}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Open Designer Modal */}
          <button
            onClick={() => setIsDesignerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Configure title, subtitle, author, and visible widgets"
          >
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <span>Report Designer</span>
          </button>

          {/* Standalone HTML Export */}
          <button
            onClick={handleDownloadOfflineHTML}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Download standalone offline HTML dashboard"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Standalone HTML</span>
          </button>

          {/* Print to PDF */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Print / PDF</span>
          </button>

          {/* Aggregated CSV */}
          <button
            onClick={handleDownloadSummaryCSV}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            title="Download aggregated segment matrix CSV"
          >
            <TableIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV Data</span>
          </button>

          {/* Markdown Download */}
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            title="Download Markdown Report"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>Markdown</span>
          </button>

          {/* Re-run / Refresh */}
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh calculations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{loading ? 'Recalculating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* POWER BI INTERACTIVE SLICERS BAR                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="print:hidden p-3.5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800/80 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span>Interactive Slicers:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dimension Slicer */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Dimension:</span>
            <select
              value={selectedDimension}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDimension(val)
                setSegmentFilter('ALL')
                handleGenerate({ primary_cat: val, primary_metric: selectedMetric })
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {facts.cat_cols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Slicer */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Target Metric:</span>
            <select
              value={selectedMetric}
              onChange={(e) => {
                const val = e.target.value
                setSelectedMetric(val)
                handleGenerate({ primary_cat: selectedDimension, primary_metric: val })
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {facts.num_cols.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Segment Quick Filter */}
          {facts.segment_ranking?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Filter Segment:</span>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Segments ({facts.segment_ranking.length})</option>
                {facts.segment_ranking.map((s) => (
                  <option key={s.segment} value={s.segment}>
                    {s.segment} ({s.share_pct}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Metric View Mode Toggle (Total vs Mean) */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700">
            <button
              onClick={() => setMetricViewMode('total')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                metricViewMode === 'total' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sum Volume
            </button>
            <button
              onClick={() => setMetricViewMode('mean')}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                metricViewMode === 'mean' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mean Yield
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STUDIO VIEW TABS                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="print:hidden border-b border-white/5 flex items-center gap-1 text-xs overflow-x-auto">
        {[
          { id: 'canvas', label: '📊 Power BI Visual Canvas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'briefing', label: '📋 Executive & Quality Briefing', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'insights', label: '💡 Strategic Insights & Roadmap', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
          { id: 'markdown', label: '📝 Raw Markdown Spec', icon: <FileCode className="w-3.5 h-3.5 text-slate-400" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.04]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: POWER BI INTERACTIVE VISUAL CANVAS                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'canvas' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Executive Directives banner if present */}
          {report.user_notes && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
              <Target className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-0.5">Executive Directives & Context:</strong>
                <p className="text-slate-300">{report.user_notes}</p>
              </div>
            </div>
          )}

          {/* SECTION A: MULTI-ROW EXECUTIVE KPI CARDS */}
          {widgets.kpiCards && kpi_cards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {kpi_cards.map((kpi) => {
                const colorMap = {
                  indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/25 text-indigo-400',
                  cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/25 text-cyan-400',
                  emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/25 text-emerald-400',
                  purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/25 text-purple-400',
                  amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/25 text-amber-400',
                  rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/25 text-rose-400',
                }
                const chosen = colorMap[kpi.color] || colorMap.indigo

                return (
                  <div
                    key={kpi.id}
                    className={`p-4 rounded-2xl bg-gradient-to-b ${chosen} border backdrop-blur-md shadow-xl flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {kpi.title}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
                        {kpi.badge}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white tracking-tight truncate my-1">
                      {kpi.value}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {kpi.subtitle}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* SECTION B: PRIMARY VISUALS GRID (RECHARTS BAR & DONUT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Visual 1: Segment Performance Clustered Bar Chart */}
            {widgets.segmentBar && chartSegments.length > 0 && (
              <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Segment Performance ({metricViewMode === 'total' ? 'Total Volume' : 'Average Yield'})
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Categorical Slicer: <span className="font-mono text-indigo-300">{facts.primary_cat}</span> • Metric: <span className="font-mono text-cyan-300">{facts.primary_metric}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSegments} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={11}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey={metricViewMode === 'total' ? 'total' : 'mean'}
                        name={metricViewMode === 'total' ? 'Total Volume' : 'Mean Yield'}
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                      >
                        {chartSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Visual 2: Market Share Donut Chart */}
            {widgets.marketShareDonut && chart_data.segment_donut?.length > 0 && (
              <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <PieIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Market Share Composition</h4>
                      <p className="text-[10px] text-slate-400">Proportional volume contribution by segment</p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chart_data.segment_donut}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chart_data.segment_donut.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(val, entry) => (
                          <span className="text-[10px] text-slate-300">
                            {val} ({entry.payload.share_pct}%)
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: SECONDARY VISUALS GRID (TREND AREA & CORRELATIONS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Visual 3: Sequential Trajectory / Cumulative Trend Area Chart */}
            {widgets.trendArea && chart_data.trend_area?.length > 0 && (
              <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Cumulative Volume Trajectory</h4>
                      <p className="text-[10px] text-slate-400">Sequential accumulation of {facts.primary_metric} across records</p>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart_data.trend_area} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stop-color="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stop-color="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="step" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        name="Cumulative Total"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Visual 4: Correlation Couplings (Feature Drivers) */}
            {widgets.correlationCouplings && chart_data.correlation_matrix?.length > 0 && (
              <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Linear Feature Drivers & Couplings</h4>
                      <p className="text-[10px] text-slate-400">Top Pearson r correlations between continuous attributes</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {chart_data.correlation_matrix.map((c, i) => {
                    const isPos = c.r >= 0
                    const barW = Math.round(Math.abs(c.r) * 100)
                    return (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-200 font-semibold">{c.pair}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isPos ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}
                          >
                            r = {c.r} ({c.strength})
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPos ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-amber-400'
                            }`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION D: POWER BI MATRIX DATA GRID */}
          {widgets.matrixTable && filteredSegments.length > 0 && (
            <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white">
                    Power BI Matrix Grid: <span className="text-indigo-400 font-mono">{facts.primary_cat}</span> by <span className="text-cyan-400 font-mono">{facts.primary_metric}</span>
                  </h4>
                </div>
                <button
                  onClick={handleDownloadSummaryCSV}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Segment ({facts.primary_cat})</th>
                      <th className="py-2.5 px-3">Total {facts.primary_metric}</th>
                      <th className="py-2.5 px-3">Average Yield</th>
                      <th className="py-2.5 px-3">Record Count</th>
                      <th className="py-2.5 px-3">Market Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredSegments.map((seg, idx) => (
                      <tr key={seg.segment} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-bold text-indigo-400">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{seg.segment}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.total.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.mean.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.count}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, seg.share_pct)}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-indigo-300">{seg.share_pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: EXECUTIVE & QUALITY BRIEFING                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'briefing' || window.matchMedia?.('print').matches) && (
        <div className="space-y-5">
          {/* Executive Summary Card */}
          <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Executive Summary & Strategic Verdict</span>
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                Health Index: {facts.health_score} / 100
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
              <strong>Analytical Verdict:</strong> {executive_summary.verdict}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{executive_summary.narrative}</p>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <h4 className="text-xs font-semibold text-slate-300">Key Highlights:</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {executive_summary.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span dangerouslySetInnerHTML={{ __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Quality & Hygiene Audit Card */}
          <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Data Quality & Hygiene Audit</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Calculated Facts
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {data_quality.calculated_facts_summary}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI Hygiene Assessment
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{data_quality.ai_explanation}</p>
            </div>

            {/* Outliers breakdown */}
            {Object.keys(facts.outlier_dict).length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Extreme Outliers Detected (1.5×IQR):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(facts.outlier_dict).map(([col, o]) => (
                    <div key={col} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-white">{col}</span>
                        <span className="text-rose-400">{o.count} outliers ({o.pct}%)</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        IQR Range: [{o.lower_bound}, {o.upper_bound}] • Max: {o.max}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: STRATEGIC INSIGHTS & ROADMAP                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'insights' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Key Strategic Insights */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Strategic Business Insights (Distinguishing Fact vs AI Explanation)</span>
            </h3>

            {key_insights.map((ins, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ins.badge}</span>
                    <h4 className="text-sm font-bold text-white">{ins.title}</h4>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      ins.impact_level === 'High'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/25'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                    }`}
                  >
                    {ins.impact_level} Impact
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-cyan-300 font-mono">
                    [Calculated Fact]:
                  </span>
                  <p className="text-slate-200 font-mono text-[11px]">{ins.fact}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-xs space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-300 font-mono">
                    [Business Interpretation]:
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">{ins.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Prioritized Recommendations & Roadmap</span>
            </h3>

            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white">{rec.area}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Priority {rec.priority}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-indigo-300">Recommended Action:</strong>
                    <p className="text-slate-200 mt-0.5 leading-relaxed">{rec.action}</p>
                  </div>
                  <div>
                    <strong className="text-slate-400">Analytical Rationale:</strong>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{rec.rationale}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-300 text-[11px]">
                    <strong>Expected Impact:</strong> {rec.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: RAW MARKDOWN SPEC                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'markdown' && (
        <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-400" />
              <span>Full GitHub-Flavored Markdown Report</span>
            </h3>
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[600px] overflow-y-auto">
            {report.markdown}
          </pre>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REPORT DESIGNER STUDIO MODAL                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isDesignerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Power BI Report Designer</h3>
                  <p className="text-[11px] text-slate-400">Customize metadata, executive context, and visible widgets</p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDesigner} className="space-y-4 text-xs">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Report Title:</label>
                  <input
                    type="text"
                    value={designerForm.title}
                    onChange={(e) => setDesignerForm({ ...designerForm, title: e.target.value })}
                    placeholder="e.g. Q4 Executive BI Analytics Report"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Subtitle / Department:</label>
                  <input
                    type="text"
                    value={designerForm.subtitle}
                    onChange={(e) => setDesignerForm({ ...designerForm, subtitle: e.target.value })}
                    placeholder="e.g. Prepared for Executive Leadership"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Author & Lead */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Prepared By / Author:</label>
                <input
                  type="text"
                  value={designerForm.author}
                  onChange={(e) => setDesignerForm({ ...designerForm, author: e.target.value })}
                  placeholder="e.g. Senior Data Analyst / Rajnish Maurya"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Executive Directives & Goals */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Executive Directives & Goals (Optional Context):</label>
                <textarea
                  rows={3}
                  value={designerForm.user_notes}
                  onChange={(e) => setDesignerForm({ ...designerForm, user_notes: e.target.value })}
                  placeholder="e.g. Focus on product tier margins, identifying lagging regional clusters, and addressing customer churn risks."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* Toggle Visual Widgets */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-slate-300 font-semibold block">Visible Visual Canvas Widgets:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ['kpiCards', 'KPI Metric Tiles'],
                    ['segmentBar', 'Segment Bar Chart'],
                    ['marketShareDonut', 'Market Share Donut'],
                    ['trendArea', 'Trend Trajectory'],
                    ['correlationCouplings', 'Driver Couplings'],
                    ['matrixTable', 'Segment Matrix Table'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 cursor-pointer hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={widgets[key]}
                        onChange={(e) => setWidgets({ ...widgets, [key]: e.target.checked })}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-300 font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDesignerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compile & Apply Studio Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
