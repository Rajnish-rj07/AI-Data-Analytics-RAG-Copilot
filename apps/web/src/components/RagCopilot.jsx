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
      parts.push(<strong key={i++} className="font-bold text-slate-900">{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      parts.push(<em key={i++} className="italic text-slate-700">{match[3]}</em>)
    } else if (match[4] !== undefined) {
      parts.push(
        <code key={i++} className="bg-slate-100 text-emerald-800 rounded px-1.5 py-0.5 text-[11px] font-mono border border-slate-200 font-semibold">
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
        <h3 key={key++} className="text-xs sm:text-sm font-bold text-slate-900 mt-3.5 mb-1.5 first:mt-0 flex items-center gap-1.5">
          <MarkdownLine text={line.slice(4)} />
        </h3>
      )
      continue
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={key++} className="text-xs font-bold text-slate-800 mt-2.5 mb-1">
          <MarkdownLine text={line.slice(5)} />
        </h4>
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-sm font-bold text-slate-900 mt-3.5 mb-1.5">
          <MarkdownLine text={line.slice(3)} />
        </h2>
      )
      continue
    }
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-slate-200 my-2" />)
      continue
    }

    const bm = line.match(/^(\s*)([•-]|\*(?!\*))\s+(.+)/)
    if (bm) {
      const isIndented = bm[1].length > 0
      elements.push(
        <div key={key++} className={`flex items-start gap-2 my-1 ${isIndented ? 'ml-4' : 'ml-1'}`}>
          <span className="text-emerald-600 mt-0.5 shrink-0 text-xs font-bold">•</span>
          <span className="text-slate-700 leading-relaxed text-xs flex-1">
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
          <span className="text-emerald-700 font-bold shrink-0 text-xs mt-0.5">{nm[2]}.</span>
          <span className="text-slate-700 leading-relaxed text-xs flex-1">
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
      <p key={key++} className="text-xs leading-relaxed text-slate-700 my-1">
        <MarkdownLine text={line} />
      </p>
    )
  }

  return <div className="space-y-0.5">{elements}</div>
}

function SourceBadge({ source }) {
  if (!source) return null
  const map = {
    'llm + rag': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'computed-truth + rag': 'bg-sky-50 text-sky-800 border-sky-200',
    'advisory-engine + rag': 'bg-amber-50 text-amber-800 border-amber-200',
    'business-strategy + rag': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'cleaning-advisor + rag': 'bg-sky-50 text-sky-800 border-sky-200',
    'ml-advisor + rag': 'bg-purple-50 text-purple-800 border-purple-200',
    'eda-hypotheses + rag': 'bg-rose-50 text-rose-800 border-rose-200',
    'executive-summary + rag': 'bg-slate-100 text-slate-800 border-slate-200',
    'conversational-synthesis + rag': 'bg-slate-100 text-slate-700 border-slate-200',
  }
  const cls = map[source] || 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${cls}`}>
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
      icon: <Wand2 className="w-3 h-3 text-emerald-600" />,
      questions: [
        'What suggestions and improvements do you recommend for this dataset?',
        'How can I improve data quality and prepare it for modeling?',
        'Are there any anomalies, outliers, or dirty records that need cleaning?',
      ],
    },
    {
      label: 'Business',
      icon: <TrendingUp className="w-3 h-3 text-sky-600" />,
      questions: [
        'What business strategy should I follow based on this data?',
        'How can we increase revenue and optimize performance?',
        'Where are we losing margin or experiencing revenue leakage?',
      ],
    },
    {
      label: 'Insights',
      icon: <Lightbulb className="w-3 h-3 text-amber-600" />,
      questions: [
        'Give me an executive summary of this dataset.',
        'What are the key takeaways and strongest trends?',
        `Which segment in ${firstCat} performs best?`,
      ],
    },
    {
      label: 'ML Readiness',
      icon: <BrainCircuit className="w-3 h-3 text-purple-600" />,
      questions: [
        'Can I train a machine learning model on this data?',
        'What features should I engineer for a predictive model?',
        `How should I preprocess ${firstCat} and numerical features for ML?`,
      ],
    },
    {
      label: 'EDA',
      icon: <BarChart3 className="w-3 h-3 text-rose-600" />,
      questions: [
        'What visualizations and charts should I explore first?',
        'Suggest data exploration hypotheses I should test.',
        `Does ${firstCat} have a significant impact on ${firstNum}?`,
      ],
    },
    {
      label: 'Stats',
      icon: <Target className="w-3 h-3 text-emerald-600" />,
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
            text: `Vector knowledge base successfully initialized! Embedded **${count} knowledge chunks** into ChromaDB with 384-dimensional dense semantic vectors.\n\nYou can now ask **any question in natural language** — suggestions, data improvements, business strategy, machine learning readiness, statistical queries, or exploratory hypotheses.`,
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
      <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900">AI Data Analytics Copilot</h2>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  RAG Assistant
                </span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Grounded in Pandas Truth
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Ask natural-language questions regarding dataset improvements, business strategies, ML modeling readiness, or exact column statistics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {isCheckingStatus ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Checking Vector Status...</span>
              </div>
            ) : isIndexed ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Vector Index Ready</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{chunkCount} chunks indexed</div>
                </div>
                <button
                  onClick={handleIndexDataset}
                  disabled={isIndexing}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{isIndexing ? 'Re-indexing...' : 'Refresh Index'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleIndexDataset}
                disabled={isIndexing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isIndexing ? 'animate-spin' : ''}`} />
                <span>{isIndexing ? 'Building Vector Store...' : 'Index Dataset Now'}</span>
              </button>
            )}
          </div>
        </div>

        {indexError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{indexError}</span>
          </div>
        )}

        {indexStats?.chunk_types && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Indexed Documents:
            </span>
            {[
              ['Overview', indexStats.chunk_types.overview || 1],
              ['Columns', indexStats.chunk_types.columns || 0],
              ['Correlations', indexStats.chunk_types.correlations || 0],
              ['Aggregations', indexStats.chunk_types.aggregations || 0],
            ].map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 font-mono text-slate-700 font-medium">
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chat + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Chat panel */}
        <div className="lg:col-span-3 flex flex-col h-[660px] rounded-xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Conversational Workspace</span>
              {messages.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-mono text-slate-700 font-bold">
                  {messages.filter((m) => m.role === 'user').length} queries
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Sliders className="w-3 h-3 text-slate-500" />
                <span>Chunks:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:border-emerald-500 font-medium"
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
                  className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer font-medium"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-slate-900">Explore Insights in Natural Language</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {!isIndexed
                      ? 'Click "Index Dataset Now" above to embed your data into the ChromaDB vector knowledge base.'
                      : 'Ask questions freely or select any prompt chip from the panel on the right.'}
                  </p>
                </div>
                {!isIndexed && (
                  <button
                    onClick={handleIndexDataset}
                    disabled={isIndexing}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-2"
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
                    className={`rounded-xl px-4 py-3 max-w-[90%] md:max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-800'
                        : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.isSystem && (
                      <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[11px] text-emerald-700 flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> AI Assistant
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
                                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold"
                              >
                                {it}
                              </span>
                            ))}
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="text-slate-400 hover:text-slate-700 transition p-1 rounded hover:bg-slate-100"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="text-xs leading-relaxed font-semibold">{msg.text}</p>
                    ) : (
                      <MarkdownBody text={msg.text} />
                    )}
                    {msg.retrievedChunks?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          onClick={() => toggleSource(msg.id)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {expandedSources[msg.id]
                              ? 'Hide Context Chunks'
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
                                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-mono text-emerald-800 font-semibold">
                                    #{idx + 1} {chunk.type}
                                  </span>
                                  <span className="font-semibold text-slate-500 font-mono">
                                    {Math.round((chunk.relevance_score || 0) * 100)}% relevance
                                  </span>
                                </div>
                                <p className="text-slate-600 font-mono text-[11px] leading-relaxed italic">
                                  "{chunk.text}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 px-2 font-mono">{msg.timestamp}</span>
                </div>
              ))
            )}
            {isAsking && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-800 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-emerald-600" />
                  <span>Retrieving knowledge chunks & synthesizing verified response...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
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
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition disabled:opacity-50 font-medium"
              />
              <button
                type="submit"
                disabled={!isIndexed || !question.trim() || isAsking}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Suggested Queries</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTION_GROUPS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setActiveSuggGroup(g.label)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer border ${
                    activeSuggGroup === g.label
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
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
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 text-xs text-slate-700 hover:text-emerald-900 transition cursor-pointer flex items-start gap-2 group disabled:opacity-50 font-medium"
                >
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 mt-0.5 shrink-0 transition" />
                  <span className="leading-snug">{sug}</span>
                </button>
              ))}
              {activeSuggs.length === 0 && (
                <p className="text-xs text-slate-400 italic">No suggestions in this category.</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Engine Architecture</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              {[
                [<Database key="db" className="w-3 h-3 text-slate-500" />, 'Vector DB', 'ChromaDB Local', 'text-slate-900'],
                [<Flame key="flame" className="w-3 h-3 text-slate-500" />, 'Embeddings', 'MiniLM-L6-v2 (384d)', 'text-slate-900'],
                [<Zap key="zap" className="w-3 h-3 text-emerald-600" />, 'Statistical Truth', 'Pandas In-Memory', 'text-emerald-700 font-bold'],
                [<Bot key="bot" className="w-3 h-3 text-slate-500" />, 'Advisory Engine', 'Autonomous NLP', 'text-slate-900'],
              ].map(([icon, label, value, vc]) => (
                <div
                  key={label}
                  className="flex items-center justify-between pb-1.5 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-1.5 text-slate-500">
                    {icon}
                    {label}:
                  </span>
                  <span className={`font-mono text-[11px] ${vc}`}>{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 italic leading-relaxed pt-1 border-t border-slate-100">
              Calculations and recommendations are strictly grounded in your dataset facts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
