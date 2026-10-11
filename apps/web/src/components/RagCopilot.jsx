import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  Send,
  Database,
  Layers,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageSquare,
  Zap,
  ArrowRight,
  Sliders,
  Flame,
  Info,
  TrendingUp,
  Wand2,
  BrainCircuit,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react'
import { datasetsApi } from '../services/api'

function MarkdownLine({ text }) {
  if (!text) return null
  const parts = []
  let remaining = text
  let i = 0
  const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let lastIndex = 0
  let match

  while ((match = inlineRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={i++}>{remaining.slice(lastIndex, match.index)}</span>)
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={i++} className="font-semibold text-white">{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      parts.push(<em key={i++} className="italic text-slate-300">{match[3]}</em>)
    } else if (match[4] !== undefined) {
      parts.push(
        <code key={i++} className="bg-slate-950/80 text-cyan-300 rounded px-1.5 py-0.5 text-[10.5px] font-mono border border-slate-700/60">
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < remaining.length) {
    parts.push(<span key={i++}>{remaining.slice(lastIndex)}</span>)
  }
  return <>{parts}</>
}

function MarkdownBody({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-bold text-white mt-4 mb-2 first:mt-0 flex items-center gap-1.5">
          <MarkdownLine text={line.slice(4)} />
        </h3>
      )
      continue
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={key++} className="text-xs font-semibold text-indigo-300 mt-3 mb-1.5">
          <MarkdownLine text={line.slice(5)} />
        </h4>
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-sm font-bold text-white mt-4 mb-2">
          <MarkdownLine text={line.slice(3)} />
        </h2>
      )
      continue
    }
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-white/10 my-2.5" />)
      continue
    }

    const bm = line.match(/^(\s*)([•\-]|\*(?!\*))\s+(.+)/)
    if (bm) {
      const isIndented = bm[1].length > 0
      elements.push(
        <div key={key++} className={`flex items-start gap-2 my-1 ${isIndented ? 'ml-4' : 'ml-1'}`}>
          <span className="text-indigo-400 mt-0.5 shrink-0 text-xs">•</span>
          <span className="text-slate-200 leading-relaxed text-[11px] flex-1">
            <MarkdownLine text={bm[3]} />
          </span>
        </div>
      )
      continue
    }

    const nm = line.match(/^(\s*)(\d+)\.\s+(.+)/)
    if (nm) {
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-1 ml-1">
          <span className="text-indigo-400 font-bold shrink-0 text-[11px] mt-0.5">{nm[2]}.</span>
          <span className="text-slate-200 leading-relaxed text-[11px] flex-1">
            <MarkdownLine text={nm[3]} />
          </span>
        </div>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1.5" />)
      continue
    }

    elements.push(
      <p key={key++} className="text-[11px] leading-relaxed text-slate-200 my-1">
        <MarkdownLine text={line} />
      </p>
    )
  }

  return <div className="space-y-0.5">{elements}</div>
}

function SourceBadge({ source }) {
  if (!source) return null
  const map = {
    'llm + rag': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'computed-truth + rag': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'advisory-engine + rag': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'business-strategy + rag': 'bg-green-500/20 text-green-300 border-green-500/30',
    'cleaning-advisor + rag': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'ml-advisor + rag': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'eda-hypotheses + rag': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    'executive-summary + rag': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'conversational-synthesis + rag': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }
  const cls = map[source] || 'bg-slate-500/15 text-slate-400 border-slate-600/30'
  return (
    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${cls}`}>
      {source.replace(' + rag', '')}
    </span>
  )
}

export default function RagCopilot({ dataset }) {
  const datasetId = dataset?.id || dataset?._id
  const [isIndexed, setIsIndexed] = useState(false)
  const [chunkCount, setChunkCount] = useState(0)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexStats, setIndexStats] = useState(null)
  const [indexError, setIndexError] = useState('')
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [topK, setTopK] = useState(4)
  const [messages, setMessages] = useState([])
  const [expandedSources, setExpandedSources] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [activeSuggGroup, setActiveSuggGroup] = useState('Improvements')
  const chatEndRef = useRef(null)

  const numCols = (dataset?.columns || []).filter(
    (c) => ['float64', 'int64', 'number'].includes(c.dataType?.toLowerCase()) || c.stats?.mean !== undefined
  )
  const catCols = (dataset?.columns || []).filter(
    (c) => !['float64', 'int64', 'number'].includes(c.dataType?.toLowerCase()) && c.stats?.mean === undefined
  )

  const firstNum = numCols[0]?.name || 'Total_Sales'
  const secondNum = numCols[1]?.name || numCols[0]?.name || 'Discount'
  const firstCat = catCols[0]?.name || 'Category'

  const SUGGESTION_GROUPS = [
    {
      label: 'Improvements',
      icon: <Wand2 className="w-3 h-3 text-emerald-400" />,
      questions: [
        'What suggestions and improvements do you recommend for this dataset?',
        'How can I improve data quality and prepare it for modeling?',
        'Are there any anomalies, outliers, or dirty records that need cleaning?',
      ],
    },
    {
      label: 'Business',
      icon: <TrendingUp className="w-3 h-3 text-blue-400" />,
      questions: [
        'What business strategy should I follow based on this data?',
        'How can we increase revenue and optimize performance?',
        'Where are we losing margin or experiencing revenue leakage?',
      ],
    },
    {
      label: 'Insights',
      icon: <Lightbulb className="w-3 h-3 text-amber-400" />,
      questions: [
        'Give me an executive summary of this dataset.',
        'What are the key takeaways and strongest trends?',
        `Which segment in ${firstCat} performs best?`,
      ],
    },
    {
      label: 'ML Readiness',
      icon: <BrainCircuit className="w-3 h-3 text-violet-400" />,
      questions: [
        'Can I train a machine learning model on this data?',
        'What features should I engineer for a predictive model?',
        `How should I preprocess ${firstCat} and numerical features for ML?`,
      ],
    },
    {
      label: 'EDA',
      icon: <BarChart3 className="w-3 h-3 text-pink-400" />,
      questions: [
        'What visualizations and charts should I explore first?',
        'Suggest data exploration hypotheses I should test.',
        `Does ${firstCat} have a significant impact on ${firstNum}?`,
      ],
    },
    {
      label: 'Stats',
      icon: <Target className="w-3 h-3 text-cyan-400" />,
      questions: [
        `What is the average, min, and max for ${firstNum}?`,
        numCols.length >= 2
          ? `What is the correlation between ${firstNum} and ${secondNum}?`
          : 'Are there any duplicate rows or null values?',
        `What are the most frequent values in ${firstCat}?`,
      ],
    },
  ]

  const checkStatus = useCallback(async () => {
    if (!datasetId) return
    setIsCheckingStatus(true)
    try {
      const res = await datasetsApi.getRagStatus(datasetId)
      if (res.success) {
        setIsIndexed(res.is_indexed)
        setChunkCount(res.chunk_count || 0)
      }
    } catch {
      setIsIndexed(false)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [datasetId])

  useEffect(() => {
    checkStatus()
    setMessages([])
    setExpandedSources({})
  }, [datasetId, checkStatus])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAsking])

  const handleIndexDataset = async () => {
    if (!datasetId || isIndexing) return
    setIsIndexing(true)
    setIndexError('')
    try {
      const res = await datasetsApi.indexRag(datasetId)
      if (res.success) {
        const count = res.stats?.indexed || 0
        setIsIndexed(true)
        setChunkCount(count)
        setIndexStats(res.stats)
        setMessages([
          {
            id: 'sys-welcome',
            role: 'assistant',
            isSystem: true,
            timestamp: new Date().toLocaleTimeString(),
            text: `Vector index ready! Embedded **${count} knowledge chunks** into ChromaDB with 384-dimensional dense semantic vectors.\n\nYou can now ask **any question in natural language** — suggestions, data improvements, business strategy, machine learning readiness, statistical queries, or exploratory hypotheses!`,
          },
        ])
      } else {
        throw new Error(res.message || 'Indexing failed')
      }
    } catch (err) {
      setIndexError(err.response?.data?.message || err.message || 'Failed to index dataset')
    } finally {
      setIsIndexing(false)
    }
  }

  const handleAsk = async (queryText) => {
    const q = (queryText || question).trim()
    if (!q || isAsking) return
    setMessages((prev) => [
      ...prev,
      { id: 'msg-' + Date.now(), role: 'user', text: q, timestamp: new Date().toLocaleTimeString() },
    ])
    setQuestion('')
    setIsAsking(true)
    try {
      const res = await datasetsApi.askRag(datasetId, q, topK)
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'res-' + Date.now(),
            role: 'assistant',
            text: res.answer,
            intents: res.intents || [],
            answerSource: res.answer_source || 'rag',
            retrievedChunks: res.retrieved_chunks || [],
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else {
        throw new Error(res.message || 'No answer received')
      }
    } catch (err) {
      const et = err.response?.data?.message || err.response?.data?.detail || err.message || 'Failed to get answer'
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          isError: true,
          text: `**Error:** ${et}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  const toggleSource = (id) => {
    setExpandedSources((p) => ({ ...p, [id]: !p[id] }))
  }

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const activeSuggs = SUGGESTION_GROUPS.find((g) => g.label === activeSuggGroup)?.questions || []

  return (
    <div className="space-y-5">
      {/* Index card */}
      <div className="p-5 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white">RAG Analytics Copilot</h2>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Phase 6
                </span>
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Conversational Advisory AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Ask <strong className="text-slate-300">any natural-language question</strong> — suggestions, improvements, business advice, ML modeling, data quality, or exact column statistics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {isCheckingStatus ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Checking Status...</span>
              </div>
            ) : isIndexed ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Vector Index Ready</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{chunkCount} chunks indexed</div>
                </div>
                <button
                  onClick={handleIndexDataset}
                  disabled={isIndexing}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{isIndexing ? 'Re-indexing...' : 'Refresh'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleIndexDataset}
                disabled={isIndexing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isIndexing ? 'animate-spin' : ''}`} />
                <span>{isIndexing ? 'Building Vector Store...' : 'Index Dataset Now'}</span>
              </button>
            )}
          </div>
        </div>
        {indexError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{indexError}</span>
          </div>
        )}
        {indexStats?.chunk_types && (
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Indexed Chunks:
            </span>
            {[
              ['Overview', indexStats.chunk_types.overview || 1, 'text-indigo-300'],
              ['Columns', indexStats.chunk_types.columns || 0, 'text-purple-300'],
              ['Correlations', indexStats.chunk_types.correlations || 0, 'text-cyan-300'],
              ['Aggregations', indexStats.chunk_types.aggregations || 0, 'text-amber-300'],
            ].map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chat + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Chat panel */}
        <div className="lg:col-span-3 flex flex-col h-[680px] rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Conversation</span>
              {messages.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
                  {messages.filter((m) => m.role === 'user').length} questions
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sliders className="w-3 h-3 text-slate-500" />
                <span>Chunks:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 outline-none"
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                </select>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-white">Ask Anything About Your Data</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {!isIndexed
                      ? 'Click "Index Dataset Now" above to embed your data into the ChromaDB vector knowledge base.'
                      : 'Ask questions naturally: suggestions, improvements, business advice, ML models, hypotheses, or click any prompt on the right.'}
                  </p>
                </div>
                {!isIndexed && (
                  <button
                    onClick={handleIndexDataset}
                    disabled={isIndexing}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isIndexing ? 'Indexing...' : 'Index Dataset to Start'}</span>
                  </button>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[90%] md:max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : msg.isError
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200'
                        : 'bg-slate-800/70 border border-slate-700/60 text-slate-100 shadow-md'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.isSystem && (
                      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[11px] text-indigo-400 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> Copilot
                          </span>
                          <SourceBadge source={msg.answerSource} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {msg.intents
                            ?.filter((i) => i !== 'general')
                            .slice(0, 3)
                            .map((it) => (
                              <span
                                key={it}
                                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-slate-700 font-semibold"
                              >
                                {it}
                              </span>
                            ))}
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700/50"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
                    ) : (
                      <MarkdownBody text={msg.text} />
                    )}
                    {msg.retrievedChunks?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5">
                        <button
                          onClick={() => toggleSource(msg.id)}
                          className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {expandedSources[msg.id]
                              ? 'Hide Evidence Chunks'
                              : `${msg.retrievedChunks.length} Retrieved Context Chunks`}
                          </span>
                          {expandedSources[msg.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {expandedSources[msg.id] && (
                          <div className="mt-2.5 space-y-2">
                            {msg.retrievedChunks.map((chunk, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-mono text-indigo-300">
                                    #{idx + 1} {chunk.type}
                                  </span>
                                  <span className="font-semibold text-emerald-400">
                                    {Math.round((chunk.relevance_score || 0) * 100)}% match
                                  </span>
                                </div>
                                <p className="text-slate-400 font-mono text-[10px] leading-relaxed italic">
                                  "{chunk.text}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 px-2 font-mono">{msg.timestamp}</span>
                </div>
              ))
            )}
            {isAsking && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-300 px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-400" />
                  <span>Synthesizing natural language response...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-white/5 bg-slate-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAsk()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  isIndexed
                    ? 'Ask anything — suggestions, improvements, business advice, ML models, statistics...'
                    : 'Index dataset above to start asking questions...'
                }
                disabled={!isIndexed || isAsking}
                className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isIndexed || !question.trim() || isAsking}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="p-4 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Suggested Questions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTION_GROUPS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setActiveSuggGroup(g.label)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                    activeSuggGroup === g.label
                      ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g.icon}
                  {g.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              {activeSuggs.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (isIndexed) handleAsk(sug)
                    else setQuestion(sug)
                  }}
                  disabled={isAsking}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-indigo-500/10 border border-slate-700/50 hover:border-indigo-500/30 text-[11px] text-slate-300 hover:text-indigo-200 transition cursor-pointer flex items-start gap-2 group disabled:opacity-50"
                >
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 mt-0.5 shrink-0 transition" />
                  <span className="leading-snug">{sug}</span>
                </button>
              ))}
              {activeSuggs.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">No suggestions for this category.</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Engine Architecture</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-400">
              {[
                [<Database key="db" className="w-3 h-3 text-indigo-400" />, 'Vector DB', 'ChromaDB Local', 'text-slate-200'],
                [<Flame key="flame" className="w-3 h-3 text-purple-400" />, 'Embeddings', 'MiniLM-L6-v2 (384d)', 'text-slate-200'],
                [<Zap key="zap" className="w-3 h-3 text-emerald-400" />, 'Stats Engine', 'Pandas Ground Truth', 'text-emerald-400'],
                [<Bot key="bot" className="w-3 h-3 text-amber-400" />, 'Advisory', 'Autonomous NLP Engine', 'text-amber-300'],
                [<Info key="info" className="w-3 h-3 text-cyan-400" />, 'LLM Mode', 'Groq / OpenAI / Ollama', 'text-cyan-300'],
              ].map(([icon, label, value, vc]) => (
                <div
                  key={label}
                  className="flex items-center justify-between pb-1.5 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-1.5">
                    {icon}
                    {label}:
                  </span>
                  <span className={`font-mono ${vc}`}>{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic leading-relaxed pt-1 border-t border-white/5">
              Calculations and recommendations are strictly grounded in your dataset facts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
