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
  Printer,
  Download,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
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
  X,
  Table as TableIcon,
  Activity,
  User,
  Loader2,
} from 'lucide-react'
import { datasetsApi } from '../services/api'

const PALETTE = [
  '#059669', // Emerald (Primary Brand)
  '#475569', // Slate (Secondary Dimension)
  '#0f766e', // Deep Teal (Tertiary Category)
  '#0284c7', // Muted Ocean (Comparative Series)
  '#d97706', // Warm Ochre (Accent / Highlight)
  '#4f46e5', // Soft Indigo (Supplementary)
]

// Custom Tooltip for Recharts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-1.5 z-50 text-slate-800">
      {label && <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#059669' }}
            />
            <span className="text-slate-500 capitalize">{entry.name || 'Value'}:</span>
          </div>
          <span className="font-mono font-bold text-slate-900">
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

  // Slicers State
  const [selectedDimension, setSelectedDimension] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL')
  const [metricViewMode, setMetricViewMode] = useState('total') // 'total' | 'mean'

  // Report Designer State
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

  // Download Standalone Offline HTML Report (Executive Light Design)
  const handleDownloadOfflineHTML = () => {
    if (!report) return
    const { facts, kpi_cards, chart_data, executive_summary, data_quality: _data_quality, key_insights, recommendations } = report

    // Construct SVG Bar Chart
    const barItems = chart_data?.segment_bar?.slice(0, 8) || []
    const maxVal = Math.max(...barItems.map((b) => b.total), 1)
    const barChartSVG = `
      <svg width="100%" height="240" viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
        <text x="20" y="25" fill="#475569" font-size="12" font-family="sans-serif" font-weight="600">Segment Volume Breakdown (${facts.primary_metric})</text>
        ${barItems
          .map((item, idx) => {
            const barH = Math.max(8, (item.total / maxVal) * 140)
            const x = 50 + idx * 65
            const y = 190 - barH
            return `
              <rect x="${x}" y="${y}" width="42" height="${barH}" rx="4" fill="#059669" />
              <text x="${x + 21}" y="205" fill="#64748b" font-size="10" text-anchor="middle" font-family="sans-serif">${item.name.substring(0, 8)}</text>
              <text x="${x + 21}" y="${y - 6}" fill="#0f172a" font-size="9" text-anchor="middle" font-weight="bold" font-family="sans-serif">${item.share_pct}%</text>
            `
          })
          .join('')}
      </svg>
    `

    // Standalone HTML template with light executive styling
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --accent: #059669;
      --accent-light: #ecfdf5;
      --success: #059669;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); padding: 32px 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .header h1 { font-size: 22px; font-weight: 800; color: var(--text-main); margin-bottom: 4px; }
    .header p { font-size: 13px; color: var(--text-muted); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: var(--accent-light); color: var(--accent); border: 1px solid #a7f3d0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .kpi-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; margin-bottom: 6px; }
    .kpi-val { font-size: 24px; font-weight: 800; font-family: monospace; color: var(--text-main); }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .card-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 12px; }
    th { padding: 10px 14px; color: var(--text-muted); border-bottom: 1px solid var(--border); font-weight: 700; font-size: 11px; text-transform: uppercase; background: #f8fafc; }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: var(--text-main); }
    tr:hover td { background: #f8fafc; }
    .callout { background: var(--accent-light); border-left: 4px solid var(--accent); padding: 14px; border-radius: 0 10px 10px 0; margin-bottom: 16px; font-size: 13px; color: #065f46; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .header, .card, .kpi-card { background: #fff; border: 1px solid #ccc; color: #000; box-shadow: none; }
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
          <span class="badge">Executive BI Dashboard</span>
          <span style="font-size:12px;color:#059669;font-weight:700;">● Grounded in Pandas Statistics</span>
        </div>
        <h1>${report.title}</h1>
        <p>${report.subtitle || ''} • Prepared by: <strong>${report.author}</strong> • Generated: ${report.generated_at}</p>
      </div>
      <div>
        <span class="badge" style="font-size:13px;padding:8px 14px;">
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
        <div class="card-title">📊 Segment Distribution</div>
        ${barChartSVG}
      </div>

      <div class="card">
        <div class="card-title">🎯 Executive Summary Verdict</div>
        <div class="callout">${executive_summary.verdict}</div>
        <p style="font-size:13px;color:#334155;line-height:1.6;">${executive_summary.narrative}</p>
        <ul style="margin-top:14px;padding-left:18px;font-size:12px;color:#64748b;">
          ${executive_summary.highlights.map((h) => `<li style="margin-bottom:4px;">${h}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🏆 Segment Breakdown Matrix (${facts.primary_cat} by ${facts.primary_metric})</div>
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
              <td style="font-weight:700;color:#059669;">#${i + 1}</td>
              <td style="font-weight:700;color:#0f172a;">${seg.segment}</td>
              <td style="font-family:monospace;">${seg.total.toLocaleString()}</td>
              <td style="font-family:monospace;">${seg.mean.toLocaleString()}</td>
              <td style="font-family:monospace;">${seg.count}</td>
              <td><strong style="color:#059669;">${seg.share_pct}%</strong></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">💡 Strategic Key Insights (Pandas Truth Grounded)</div>
        ${key_insights
          .map(
            (ins) => `
          <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;">${ins.title}</div>
            <div style="font-size:11px;font-family:monospace;background:#f8fafc;padding:6px 10px;border-radius:6px;margin-bottom:6px;color:#059669;">[Fact]: ${ins.fact}</div>
            <div style="font-size:12px;color:#475569;">${ins.explanation}</div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="card">
        <div class="card-title">🎯 Prioritized Recommendations</div>
        ${recommendations
          .map(
            (rec, i) => `
          <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:2px;">${i + 1}. ${rec.area}</div>
            <div style="font-size:12px;color:#0f172a;font-weight:600;margin-bottom:4px;">${rec.action}</div>
            <div style="font-size:12px;color:#64748b;">${rec.rationale}</div>
            <div style="font-size:11px;color:#059669;margin-top:4px;font-weight:600;">Expected Impact: ${rec.impact}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(report.title || 'executive_report').toLowerCase().replace(/\s+/g, '_')}_offline.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download Aggregated Summary CSV
  const handleDownloadSummaryCSV = () => {
    if (!report?.facts?.segment_ranking) return
    const headers = ['Segment', `Total_${report.facts.primary_metric}`, 'Mean_Yield', 'Record_Count', 'Market_Share_Pct']
    const rows = report.facts.segment_ranking.map((s) => [
      `"${s.segment}"`,
      s.total,
      s.mean,
      s.count,
      s.share_pct,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(report.facts.primary_cat || 'segment')}_matrix_summary.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download Full Markdown Report
  const handleDownloadMarkdown = () => {
    if (!report?.markdown) return
    const blob = new Blob([report.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(report.title || 'report').toLowerCase().replace(/\s+/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Copy Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!report?.markdown) return
    navigator.clipboard.writeText(report.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Print PDF
  const handlePrint = () => {
    window.print()
  }

  // Save Designer Form
  const handleSaveDesigner = (e) => {
    e.preventDefault()
    setIsDesignerOpen(false)
    handleGenerate({
      title: designerForm.title,
      subtitle: designerForm.subtitle,
      author: designerForm.author,
      user_notes: designerForm.user_notes,
    })
  }

  if (loading && !report) {
    return (
      <div className="p-16 rounded-xl border border-slate-200 bg-white text-center space-y-4 shadow-xs">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Compiling Executive BI Report</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Computing KPI metrics, multi-dimensional segment matrices, and strategic advisory facts...
          </p>
        </div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="p-8 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-800">Report Generation Error</h3>
        <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => handleGenerate()}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-16 rounded-xl border border-slate-200 bg-white text-center space-y-4 shadow-2xs">
        <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700 shadow-2xs">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900">Executive BI Report Studio</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Generate presentation-ready dashboards with interactive visuals, multi-row KPI tiles, sliceable dimensions, and downloadable standalone HTML/PDF reports.
          </p>
        </div>
        <button
          onClick={() => handleGenerate()}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Executive Report Studio</span>
        </button>
      </div>
    )
  }

  const { facts, kpi_cards = [], chart_data = {}, executive_summary, data_quality, key_insights, recommendations } = report

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* ── POWER BI TOP RIBBON & ACTION HEADER ──────────────────────────── */}
      <div className="print:hidden p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-2xs shrink-0 text-emerald-700">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{report.title}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-600" /> Interactive Studio
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Grounded in Pandas Facts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              {report.author && (
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <User className="w-3 h-3 text-slate-400" /> {report.author}
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3 text-slate-400" /> {report.generated_at}
              </span>
              <span>•</span>
              <span className="font-mono text-emerald-800 font-semibold">{facts.filename}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Open Designer Modal */}
          <button
            onClick={() => setIsDesignerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Configure title, subtitle, author, and visible widgets"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Designer</span>
          </button>

          {/* Standalone HTML Export */}
          <button
            onClick={handleDownloadOfflineHTML}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download standalone offline HTML dashboard"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Standalone HTML</span>
          </button>

          {/* Print to PDF */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / PDF</span>
          </button>

          {/* Aggregated CSV */}
          <button
            onClick={handleDownloadSummaryCSV}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download aggregated segment matrix CSV"
          >
            <TableIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV Data</span>
          </button>

          {/* Markdown Download */}
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download Markdown Report"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>Markdown</span>
          </button>

          {/* Re-run / Refresh */}
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Refresh calculations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE SLICERS BAR ──────────────────────────────────────── */}
      <div className="print:hidden p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-800 font-bold shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span>Interactive Slicers:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dimension Slicer */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">Dimension:</span>
            <select
              value={selectedDimension}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDimension(val)
                setSegmentFilter('ALL')
                handleGenerate({ primary_cat: val, primary_metric: selectedMetric })
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
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
            <span className="text-[11px] text-slate-500 font-medium">Target Metric:</span>
            <select
              value={selectedMetric}
              onChange={(e) => {
                const val = e.target.value
                setSelectedMetric(val)
                handleGenerate({ primary_cat: selectedDimension, primary_metric: val })
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
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
              <span className="text-[11px] text-slate-500 font-medium">Filter Segment:</span>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
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

          {/* Metric View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setMetricViewMode('total')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                metricViewMode === 'total' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sum Volume
            </button>
            <button
              onClick={() => setMetricViewMode('mean')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                metricViewMode === 'mean' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mean Yield
            </button>
          </div>
        </div>
      </div>

      {/* ── STUDIO VIEW TABS ─────────────────────────────────────────────── */}
      <div className="print:hidden border-b border-slate-200/80 flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
        {[
          { id: 'canvas', label: '📊 Visual Canvas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'briefing', label: '📋 Executive & Quality Briefing', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'insights', label: '💡 Strategic Insights & Roadmap', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> },
          { id: 'markdown', label: '📝 Markdown Spec', icon: <FileCode className="w-3.5 h-3.5 text-slate-500" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap text-xs ${
              activeTab === t.id
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: POWER BI INTERACTIVE VISUAL CANVAS ─────────────────────── */}
      {(activeTab === 'canvas' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Executive Directives banner if present */}
          {report.user_notes && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-3">
              <Target className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Executive Directives & Context:</strong>
                <p className="text-slate-700">{report.user_notes}</p>
              </div>
            </div>
          )}

          {/* SECTION A: MULTI-ROW EXECUTIVE KPI CARDS */}
          {widgets.kpiCards && kpi_cards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {kpi_cards.map((kpi) => (
                <div
                  key={kpi.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                      {kpi.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {kpi.badge}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 tracking-tight truncate my-1">
                    {kpi.value}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-1 font-medium">
                    {kpi.subtitle}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION B: PRIMARY VISUALS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Visual 1: Segment Performance Clustered Bar Chart */}
            {widgets.segmentBar && chartSegments.length > 0 && (
              <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Segment Performance ({metricViewMode === 'total' ? 'Total Volume' : 'Average Yield'})
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Dimension: <span className="font-mono text-slate-700 font-semibold">{facts.primary_cat}</span> • Metric: <span className="font-mono text-emerald-700 font-semibold">{facts.primary_metric}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSegments} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={10}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey={metricViewMode === 'total' ? 'total' : 'mean'}
                        name={metricViewMode === 'total' ? 'Total Volume' : 'Mean Yield'}
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
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
              <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                      <PieIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Market Share Distribution</h4>
                      <p className="text-[10px] text-slate-500">Proportional volume contribution by segment</p>
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
                          <span className="text-[10px] text-slate-700 font-medium">
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

          {/* SECTION C: SECONDARY VISUALS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Visual 3: Sequential Trajectory / Cumulative Trend Area Chart */}
            {widgets.trendArea && chart_data.trend_area?.length > 0 && (
              <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Cumulative Volume Trajectory</h4>
                      <p className="text-[10px] text-slate-500">Sequential accumulation of {facts.primary_metric} across observed records</p>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart_data.trend_area} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaGradLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="step" stroke="#64748b" fontSize={10} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        name="Cumulative Total"
                        stroke="#059669"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaGradLight)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Visual 4: Correlation Couplings (Feature Drivers) */}
            {widgets.correlationCouplings && chart_data.correlation_matrix?.length > 0 && (
              <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Linear Feature Drivers & Couplings</h4>
                      <p className="text-[10px] text-slate-500">Top Pearson r correlations between continuous attributes</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {chart_data.correlation_matrix.map((c, i) => {
                    const isPos = c.r >= 0
                    const barW = Math.round(Math.abs(c.r) * 100)
                    return (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-800 font-bold">{c.pair}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isPos ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'
                            }`}
                          >
                            r = {c.r} ({c.strength})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPos ? 'bg-emerald-600' : 'bg-rose-500'
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

          {/* SECTION D: MATRIX DATA GRID */}
          {widgets.matrixTable && filteredSegments.length > 0 && (
            <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Segment Matrix Grid: <span className="text-slate-800 font-mono">{facts.primary_cat}</span> by <span className="text-emerald-700 font-mono">{facts.primary_metric}</span>
                  </h4>
                </div>
                <button
                  onClick={handleDownloadSummaryCSV}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-600" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Segment ({facts.primary_cat})</th>
                      <th className="py-2.5 px-3">Total {facts.primary_metric}</th>
                      <th className="py-2.5 px-3">Average Yield</th>
                      <th className="py-2.5 px-3">Record Count</th>
                      <th className="py-2.5 px-3">Market Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredSegments.map((seg, idx) => (
                      <tr key={seg.segment} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-bold text-emerald-700">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{seg.segment}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.total.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.mean.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono">{seg.count}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, seg.share_pct)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-emerald-800">{seg.share_pct}%</span>
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

      {/* ── TAB 2: EXECUTIVE & QUALITY BRIEFING ──────────────────────────── */}
      {(activeTab === 'briefing' || window.matchMedia?.('print').matches) && (
        <div className="space-y-5">
          {/* Executive Summary Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>Executive Summary & Strategic Verdict</span>
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Health Index: {facts.health_score} / 100
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
              <strong>Analytical Verdict:</strong> {executive_summary.verdict}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{executive_summary.narrative}</p>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800">Key Highlights:</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {executive_summary.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span dangerouslySetInnerHTML={{ __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Quality & Hygiene Audit Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Data Quality & Hygiene Audit</span>
            </h3>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Calculated Facts
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-mono">
                {data_quality.calculated_facts_summary}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                AI Hygiene Assessment
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">{data_quality.ai_explanation}</p>
            </div>

            {/* Outliers breakdown */}
            {Object.keys(facts.outlier_dict).length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-800 mb-2">Extreme Outliers Detected (1.5×IQR):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(facts.outlier_dict).map(([col, o]) => (
                    <div key={col} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-slate-900">{col}</span>
                        <span className="text-rose-700 font-semibold">{o.count} outliers ({o.pct}%)</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
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

      {/* ── TAB 3: STRATEGIC INSIGHTS & ROADMAP ──────────────────────────── */}
      {(activeTab === 'insights' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Key Strategic Insights */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Strategic Business Insights (Distinguishing Fact vs AI Interpretation)</span>
            </h3>

            {key_insights.map((ins, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ins.badge}</span>
                    <h4 className="text-sm font-bold text-slate-900">{ins.title}</h4>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      ins.impact_level === 'High'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {ins.impact_level} Impact
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 font-mono">
                    [Calculated Fact]:
                  </span>
                  <p className="text-slate-800 font-mono text-[11px]">{ins.fact}</p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-200/60 text-xs space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 font-mono">
                    [Business Interpretation]:
                  </span>
                  <p className="text-slate-700 text-xs leading-relaxed">{ins.explanation}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Prioritized Recommendations & Strategic Roadmap</span>
            </h3>

            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{rec.area}</h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    Priority {rec.priority}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-slate-900">Recommended Action:</strong>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{rec.action}</p>
                  </div>
                  <div>
                    <strong className="text-slate-500">Analytical Rationale:</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{rec.rationale}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                    <strong>Expected Impact:</strong> {rec.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: RAW MARKDOWN SPEC ─────────────────────────────────────── */}
      {activeTab === 'markdown' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-500" />
              <span>Full GitHub-Flavored Markdown Report</span>
            </h3>
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[600px] overflow-y-auto">
            {report.markdown}
          </pre>
        </div>
      )}

      {/* ── REPORT DESIGNER MODAL ────────────────────────────────────────── */}
      {isDesignerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Executive Report Designer</h3>
                  <p className="text-[11px] text-slate-500">Configure report metadata, executive directive context, and canvas widgets</p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer text-xs font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDesigner} className="space-y-4 text-xs">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Report Title:</label>
                  <input
                    type="text"
                    value={designerForm.title}
                    onChange={(e) => setDesignerForm({ ...designerForm, title: e.target.value })}
                    placeholder="e.g. Q4 Executive Analytics Report"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">Subtitle / Department:</label>
                  <input
                    type="text"
                    value={designerForm.subtitle}
                    onChange={(e) => setDesignerForm({ ...designerForm, subtitle: e.target.value })}
                    placeholder="e.g. Prepared for University Demonstration"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Author & Lead */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Prepared By / Author:</label>
                <input
                  type="text"
                  value={designerForm.author}
                  onChange={(e) => setDesignerForm({ ...designerForm, author: e.target.value })}
                  placeholder="e.g. Rajnish Maurya / Lead Engineer"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Executive Directives & Goals */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">Executive Directives & Goals (Optional Context):</label>
                <textarea
                  rows={3}
                  value={designerForm.user_notes}
                  onChange={(e) => setDesignerForm({ ...designerForm, user_notes: e.target.value })}
                  placeholder="e.g. Focus on high-performing product categories, identifying return rate correlations, and margin leakage risks."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Toggle Visual Widgets */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-slate-800 font-bold block">Visible Visual Canvas Widgets:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ['kpiCards', 'KPI Metric Tiles'],
                    ['segmentBar', 'Segment Bar Chart'],
                    ['marketShareDonut', 'Market Share Donut'],
                    ['trendArea', 'Trend Trajectory'],
                    ['correlationCouplings', 'Driver Couplings'],
                    ['matrixTable', 'Segment Matrix Table'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={widgets[key]}
                        onChange={(e) => setWidgets({ ...widgets, [key]: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-700 font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDesignerOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Studio Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
