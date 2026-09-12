import { useState, useRef, useEffect, useCallback } from 'react'
import './HelpWidget.css'

interface HelpMessage {
  role: 'user' | 'assistant'
  content: string
}

export function HelpWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy **Mono**, el asistente experto de MonoCrom.\n\nPuedo ayudarte con configuración, agentes, archivos, modos de operación y cualquier duda sobre la plataforma.\n\n¿En qué te puedo ayudar hoy?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: HelpMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? '...' }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ No pude conectar. Verifica que MonoCrom esté corriendo.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function renderContent(text: string) {
    return text.split('\n').map((line, i, arr) => {
      const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/)
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('`') && part.endsWith('`'))
              return <code key={j} className="hw-code">{part.slice(1, -1)}</code>
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={j}>{part.slice(2, -2)}</strong>
            return part
          })}
          {i < arr.length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className="hw-root">
      {open && (
        <div className="hw-panel" role="dialog" aria-label="Asistente MonoCrom">
          <div className="hw-header">
            <div className="hw-header-info">
              <div className="hw-avatar">🐒</div>
              <div>
                <div className="hw-name">Mono</div>
                <div className="hw-status">Experto MonoCrom · siempre activo</div>
              </div>
            </div>
            <button className="hw-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
          </div>

          <div className="hw-messages">
            {messages.map((m, i) => (
              <div key={i} className={`hw-msg hw-msg--${m.role}`}>
                {m.role === 'assistant' && <div className="hw-msg-avatar">🐒</div>}
                <div className="hw-bubble">{renderContent(m.content)}</div>
              </div>
            ))}
            {loading && (
              <div className="hw-msg hw-msg--assistant">
                <div className="hw-msg-avatar">🐒</div>
                <div className="hw-bubble hw-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="hw-input-row">
            <textarea
              ref={inputRef}
              className="hw-input"
              placeholder="Escribe tu pregunta…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="hw-send"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >➤</button>
          </div>
        </div>
      )}
      <button
        className={`hw-fab ${open ? 'hw-fab--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Abrir asistente MonoCrom"
        title="Mono — Asistente experto MonoCrom"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Robot/AI agent face */}
            <rect x="8" y="14" width="32" height="26" rx="7" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2"/>
            <rect x="15" y="21" width="6" height="6" rx="2" fill="white"/>
            <rect x="27" y="21" width="6" height="6" rx="2" fill="white"/>
            <path d="M17 33 Q24 37 31 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="24" y1="14" x2="24" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="7" r="2.5" fill="white"/>
            <line x1="8" y1="26" x2="4" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="40" y1="26" x2="44" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </div>
  )
}
