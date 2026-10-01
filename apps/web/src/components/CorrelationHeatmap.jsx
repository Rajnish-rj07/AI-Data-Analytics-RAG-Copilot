import React, { useMemo } from 'react'

function interpolateColor(value) {
  // -1 = strong negative (red), 0 = neutral (dark bg), +1 = strong positive (indigo-cyan)
  const abs = Math.abs(value)
  if (abs < 0.1) return { bg: 'rgba(30,41,59,0.5)', text: '#64748b' }

  if (value > 0) {
    // Positive: indigo spectrum
    const alpha = Math.min(0.9, 0.2 + abs * 0.7)
    const r = Math.round(99 + (6 - 99) * abs)   // 99→6
    const g = Math.round(102 + (182 - 102) * abs) // 102→182
    const b = Math.round(241 + (212 - 241) * abs) // 241→212
    return {
      bg: `rgba(${r},${g},${b},${alpha})`,
      text: abs > 0.5 ? '#fff' : '#a5b4fc',
    }
  } else {
    // Negative: orange-red spectrum
    const alpha = Math.min(0.9, 0.2 + abs * 0.7)
    return {
      bg: `rgba(239,68,68,${alpha})`,
      text: abs > 0.5 ? '#fff' : '#fca5a5',
    }
  }
}

function CorrelationTooltip({ cell, visible, x, y }) {
  if (!visible || !cell) return null
  const strength =
    cell.x === cell.y
      ? 'Self-correlation'
      : Math.abs(cell.value) >= 0.7
      ? 'Strong'
      : Math.abs(cell.value) >= 0.4
      ? 'Moderate'
      : 'Weak'
  const direction =
    cell.x === cell.y ? '' : cell.value > 0 ? 'positive' : 'negative'

  return (
    <div
      className="fixed z-50 px-3 py-2 rounded-lg bg-slate-900/98 border border-slate-700 shadow-2xl text-xs pointer-events-none"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-bold text-slate-100">{cell.x} × {cell.y}</p>
      <p className="text-indigo-300 mt-0.5 font-mono font-bold">{cell.value.toFixed(3)}</p>
      <p className="text-slate-400 mt-0.5">{strength} {direction}</p>
    </div>
  )
}

export default function CorrelationHeatmap({ correlations }) {
  const [hovered, setHovered] = React.useState(null)
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 })

  const { columns = [], matrix = [], strong_correlations = [] } = correlations

  // Group matrix into rows keyed by x column
  const rows = useMemo(() => {
    return columns.map((rowCol) => ({
      label: rowCol,
      cells: columns.map((colCol) => {
        const cell = matrix.find((m) => m.x === rowCol && m.y === colCol)
        return {
          x: rowCol,
          y: colCol,
          value: cell?.value ?? 0,
        }
      }),
    }))
  }, [columns, matrix])

  if (!columns.length) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs rounded-2xl glass-panel border border-slate-800">
        Not enough numerical columns for correlation analysis (need at least 2).
      </div>
    )
  }

  const labelWidth = Math.max(...columns.map((c) => c.length)) * 7 + 8
  const cellSize = Math.max(36, Math.min(72, Math.floor(600 / columns.length)))

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-200 px-1 flex items-center gap-2">
        Pearson Correlation Matrix
        <span className="text-[10px] font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          {columns.length} × {columns.length} numerical columns
        </span>
      </h3>

      {/* Heatmap Grid */}
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-5 overflow-x-auto">
        <div className="inline-block">
          {/* Column Headers */}
          <div className="flex" style={{ marginLeft: labelWidth }}>
            {columns.map((col) => (
              <div
                key={col}
                className="text-[9px] text-slate-400 text-center overflow-hidden"
                style={{
                  width: cellSize,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  height: 60,
                  padding: '2px 4px',
                }}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <div key={row.label} className="flex items-center">
              {/* Row label */}
              <div
                className="text-[10px] text-slate-400 text-right pr-2 shrink-0 truncate"
                style={{ width: labelWidth }}
              >
                {row.label}
              </div>
              {/* Cells */}
              {row.cells.map((cell) => {
                const { bg, text } = interpolateColor(cell.value)
                const isSelf = cell.x === cell.y
                return (
                  <div
                    key={cell.y}
                    style={{ width: cellSize, height: cellSize, background: bg }}
                    className="flex items-center justify-center text-[10px] font-mono font-bold border border-slate-900/40 cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                    onMouseEnter={(e) => {
                      setHovered(cell)
                      setMousePos({ x: e.clientX, y: e.clientY })
                    }}
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span style={{ color: text }}>
                      {isSelf ? '1.0' : cell.value.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Color Scale Legend */}
          <div className="flex items-center gap-3 mt-3 ml-0" style={{ marginLeft: labelWidth }}>
            <span className="text-[9px] text-slate-500">-1.0</span>
            <div
              className="flex-1 h-2 rounded"
              style={{ background: 'linear-gradient(to right, #ef4444, #1e293b, #6366f1)' }}
            />
            <span className="text-[9px] text-slate-500">+1.0</span>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 mt-1" style={{ marginLeft: labelWidth }}>
            <span>Strong Negative</span>
            <span>No Correlation</span>
            <span>Strong Positive</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <CorrelationTooltip
        cell={hovered}
        visible={!!hovered}
        x={mousePos.x}
        y={mousePos.y}
      />

      {/* Strong Correlations List */}
      {strong_correlations.length > 0 && (
        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Notable Relationships (|r| ≥ 0.4)
          </h4>
          <div className="space-y-2">
            {strong_correlations.slice(0, 8).map((corr, i) => {
              const isPositive = corr.correlation > 0
              const strength = Math.abs(corr.correlation) >= 0.7 ? 'Strong' : 'Moderate'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                    isPositive
                      ? 'bg-indigo-500/5 border-indigo-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-sm shrink-0"
                    style={{
                      background: isPositive ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)',
                      color: isPositive ? '#a5b4fc' : '#fca5a5',
                    }}
                  >
                    {corr.correlation.toFixed(2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 text-[11px]">
                      {corr.col1} ↔ {corr.col2}
                    </p>
                    <p className="text-slate-400 text-[10px] truncate">
                      {strength} {isPositive ? 'positive' : 'negative'} correlation
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isPositive
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                        : 'bg-red-500/10 text-red-400 border-red-500/25'
                    }`}
                  >
                    {strength}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
