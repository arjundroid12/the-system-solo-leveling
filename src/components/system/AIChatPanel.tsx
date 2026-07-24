'use client'

import { useState, useEffect, useRef } from 'react'
import { useSystem } from '@/lib/store'
import { getAuth } from '@/lib/auth'
import { soundClick, soundNotification } from '@/lib/sound'

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; timestamp: string; actions?: any[] }

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      const auth = getAuth()
      if (!auth) return
      try {
        const res = await fetch('/api/ai-chat', { headers: { Authorization: `Bearer ${auth.token}` } })
        const data = await res.json()
        if (data.messages?.length > 0) {
          setMessages(data.messages)
        } else {
          setMessages([{
            id: 'welcome', role: 'assistant', timestamp: new Date().toISOString(),
            content: '[ SYSTEM ]\n\nI am your growth coach. I can:\n• Analyze your progress and suggest next steps\n• Create custom quests for you\n• Modify your daily quests\n• Adjust your growth plan\n• Generate weekly reviews\n\nTell me your goals, ask for advice, or give me commands like:\n"Create a React learning quest"\n"Analyze my progress"\n"Make today harder"\n"What should I focus on?"'
          }])
        }
      } catch {}
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)
    soundClick()

    // Add user message immediately
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const auth = getAuth()
    if (!auth) { setLoading(false); return }

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()

      const aiMsg: ChatMsg = {
        id: data.messageId || Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        actions: data.actions || [],
      }
      setMessages(prev => [...prev, aiMsg])

      // If AI created a quest, refresh local quests
      if (data.actions?.some((a: any) => a.type === 'CREATE_QUEST' && a.success)) {
        soundNotification()
        // Trigger a pull to get the new quest
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '[ SYSTEM ERROR ]\n\nConnection failed. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="sl-window w-full max-w-md h-[80vh] md:h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sl-title-bar flex-shrink-0">
          <span>◆ SYSTEM AI — GROWTH COACH</span>
          <button onClick={onClose} className="ml-auto text-[var(--system-text-dim)] hover:text-[var(--system-cyan)]">✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-lg text-xs ${
                  m.role === 'user'
                    ? 'bg-[var(--system-blue)]/20 border border-[var(--system-blue)]/30 text-[var(--system-text)]'
                    : 'bg-[var(--system-dark)] border border-[var(--system-border)] sl-glow-blue'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--system-border)] space-y-1">
                    {m.actions.map((a: any, i: number) => (
                      <p key={i} className="text-[10px] sl-glow-gold">
                        {a.type === 'CREATE_QUEST' && a.success ? `✓ Created quest: ${a.questTitle}` : ''}
                        {a.type === 'NOTIFY' ? `📢 ${a.title}: ${a.message}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--system-dark)] border border-[var(--system-border)] p-3 rounded-lg">
                <p className="text-xs sl-glow-blue sl-pulse">◆ SYSTEM is analyzing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-3 border-t border-[var(--system-border)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask the System..."
              className="flex-1 bg-transparent border border-[var(--system-border)] text-[var(--system-text)] text-xs px-3 py-2 outline-none focus:border-[var(--system-cyan)]"
              disabled={loading}
            />
            <button onClick={send} disabled={loading || !input.trim()} className="sl-btn px-4 py-2 text-[10px]">
              {loading ? '...' : 'SEND'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
