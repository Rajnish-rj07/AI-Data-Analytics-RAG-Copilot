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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Dataset Repository</h3>
                <p className="text-[11px] text-slate-500 font-medium">Stored in MongoDB Atlas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading dataset history from cluster...
              </div>
            ) : datasets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No saved datasets yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Upload a CSV or Excel file to automatically cache metadata in your cluster.
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
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800 transition">
                            {item.originalName}
                          </h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] uppercase font-bold tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Rows className="w-3 h-3 text-slate-500" />
                            {(item.summary?.rowCount ?? 0).toLocaleString()} rows • {item.summary?.columnCount ?? item.columnNames?.length ?? item.columns?.length ?? 0} cols
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-slate-500" />
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
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
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
                        className="w-full mt-2 py-1 px-3 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Open Workspace
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 text-center text-[11px] text-slate-500 font-medium">
            Total {datasets.length} dataset{datasets.length === 1 ? '' : 's'} stored in MongoDB Atlas
          </div>
        </div>
      </div>
    </div>
  )
}
