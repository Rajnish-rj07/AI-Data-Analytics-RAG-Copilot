import React, { useMemo } from 'react'

function interpolateColor(value) {
  // -1 = strong negative (rose), 0 = neutral (#f8fafc), +1 = strong positive (emerald)
  const abs = Math.abs(value)
  if (abs < 0.1) return { bg: '#f8fafc', text: '#64748b' }

  if (value > 0) {
    // Positive: Emerald spectrum
    const alpha = Math.min(0.85, 0.15 + abs * 0.7)
    return {
      bg: `rgba(5, 150, 105, ${alpha})`,
      text: abs > 0.45 ? '#ffffff' : '#065f46',
    }
  } else {
    // Negative: Rose spectrum
    const alpha = Math.min(0.85, 0.15 + abs * 0.7)
    return {
      bg: `rgba(225, 29, 72, ${alpha})`,
      text: abs > 0.45 ? '#ffffff' : '#9f1239',
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
      className="fixed z-50 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-xl text-xs pointer-events-none text-slate-800"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-bold text-slate-900">{cell.x} × {cell.y}</p>
      <p className="text-emerald-700 mt-0.5 font-mono font-bold">{cell.value.toFixed(3)}</p>
      <p className="text-slate-500 mt-0.5">{strength} {direction}</p>
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
      <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-white border border-slate-200">
        Not enough numerical columns for correlation analysis (need at least 2).
      </div>
    )
  }

  const labelWidth = Math.max(...columns.map((c) => c.length)) * 7 + 8
  const cellSize = Math.max(38, Math.min(72, Math.floor(600 / columns.length)))

  return (
    <div className="space-y-6">
      <h3 className="text-xs sm:text-sm font-bold text-slate-900 px-1 flex items-center gap-2">
        Pearson Correlation Matrix
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {columns.length} × {columns.length} numerical features
        </span>
      </h3>

      {/* Heatmap Grid */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 overflow-x-auto shadow-2xs">
        <div className="inline-block">
          {/* Column Headers */}
          <div className="flex" style={{ marginLeft: labelWidth }}>
            {columns.map((col) => (
              <div
                key={col}
                className="text-[10px] font-medium text-slate-600 text-center overflow-hidden"
                style={{
                  width: cellSize,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  height: 64,
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
                className="text-[10px] font-medium text-slate-600 text-right pr-2 shrink-0 truncate"
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
                    className="flex items-center justify-center text-[10px] font-mono font-bold border border-slate-200/70 cursor-default transition-transform hover:scale-110 hover:z-10 relative"
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
          <div className="flex items-center gap-3 mt-4 ml-0" style={{ marginLeft: labelWidth }}>
            <span className="text-[10px] font-mono text-slate-500">-1.0 (Inverse)</span>
            <div
              className="flex-1 h-2 rounded-full"
              style={{ background: 'linear-gradient(to right, #e11d48, #f8fafc, #059669)' }}
            />
            <span className="text-[10px] font-mono text-slate-500">+1.0 (Direct)</span>
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

      {/* Notable Relationships List */}
      {strong_correlations.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Notable Relationships (|r| ≥ 0.4)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {strong_correlations.slice(0, 8).map((corr, i) => {
              const isPositive = corr.correlation > 0
              const strength = Math.abs(corr.correlation) >= 0.7 ? 'Strong' : 'Moderate'
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                    isPositive
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 border ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {corr.correlation.toFixed(2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs">
                      {corr.col1} ↔ {corr.col2}
                    </p>
                    <p className="text-slate-500 text-[11px] truncate">
                      {strength} {isPositive ? 'positive' : 'negative'} correlation
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
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
