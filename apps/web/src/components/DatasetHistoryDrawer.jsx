import React from 'react'
import { X, Trash2, FolderOpen, Calendar, HardDrive, Rows } from 'lucide-react'


export default function DatasetHistoryDrawer({
  isOpen,
  onClose,
  datasets = [],
  activeDatasetId,
  onSelectDataset,
  onDeleteDataset,
  isLoading,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0f1629] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Saved Datasets</h3>
                <p className="text-[11px] text-slate-400">Stored in MongoDB Atlas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading datasets from MongoDB Atlas...
              </div>
            ) : datasets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FolderOpen className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                <p className="text-xs font-medium text-slate-300">No saved datasets yet</p>
                <p className="text-[11px] text-slate-500">
                  Upload a CSV or XLSX file to save it to your Atlas cluster.
                </p>
              </div>
            ) : (
              datasets.map((item) => {
                const isActive = activeDatasetId === item._id || activeDatasetId === item.id
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent'

                return (
                  <div
                    key={item._id || item.id}
                    className={`p-3.5 rounded-xl border transition group relative ${
                      isActive
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition">
                            {item.originalName}
                          </h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] uppercase font-bold tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Rows className="w-3 h-3 text-cyan-400" />
                            {item.summary?.rowCount?.toLocaleString() || 0} rows
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-purple-400" />
                            {item.fileSizeKb || 0} KB
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {dateStr}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteDataset(item._id || item.id)
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="Delete from MongoDB"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => {
                          onSelectDataset(item._id || item.id)
                          onClose()
                        }}
                        className="w-full mt-2 py-1 px-3 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/80 text-[11px] font-medium transition cursor-pointer"
                      >
                        Load Dataset
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-slate-900/60 text-center text-[11px] text-slate-500">
            Total {datasets.length} dataset{datasets.length === 1 ? '' : 's'} stored in Atlas cluster
          </div>
        </div>
      </div>
    </div>
  )
}
