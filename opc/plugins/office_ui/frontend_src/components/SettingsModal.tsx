import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

interface LLMConfigResponse {
  default_model: string
  has_api_key: boolean
  api_key_masked: string
  api_base: string
  temperature: number
}

const POPULAR_MODELS = [
  { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o', provider: 'openai' },
  { label: 'Claude 3.7 Sonnet', value: 'anthropic/claude-3-7-sonnet-latest', provider: 'anthropic' },
  { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3-5-sonnet-20241022', provider: 'anthropic' },
  { label: 'DeepSeek V3 / R1', value: 'deepseek/deepseek-chat', provider: 'deepseek' },
  { label: 'OpenRouter Auto', value: 'openrouter/auto', provider: 'openrouter' },
  { label: 'Google Gemini 2.5 Pro', value: 'gemini/gemini-2.5-pro', provider: 'gemini' },
  { label: 'Ollama Local (Llama 3.3)', value: 'ollama/llama3.3', provider: 'ollama' },
]

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const { t } = useI18n()
  const [model, setModel] = useState('openai/gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/config/llm')
      if (res.ok) {
        const data: LLMConfigResponse = await res.json()
        if (data.default_model) setModel(data.default_model)
        if (data.api_base) setApiBase(data.api_base)
        if (data.temperature !== undefined) setTemperature(data.temperature)
        setHasExistingKey(Boolean(data.has_api_key))
        setMaskedKey(data.api_key_masked || '')
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchConfig()
    }
  }, [isOpen, fetchConfig])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload: Record<string, any> = {
        default_model: model.trim(),
        api_base: apiBase.trim(),
        temperature: Number(temperature),
      }
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim()
      }

      const res = await fetch('/api/config/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setMessage({ text: t('settings.saved'), type: 'success' })
        setApiKey('')
        fetchConfig()
        onSaved?.()
      } else {
        setMessage({ text: t('settings.error'), type: 'error' })
      }
    } catch {
      setMessage({ text: t('settings.error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="settings-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="settings-modal-card"
        style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: 14,
          width: '100%',
          maxWidth: 540,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          color: '#f4f4f5',
          fontFamily: 'inherit',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #27272a',
            background: '#121215',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fafafa' }}>
              {t('settings.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#a1a1aa' }}>
              {t('common.loading')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {message && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: message.type === 'success' ? '#064e3b' : '#7f1d1d',
                    color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${message.type === 'success' ? '#059669' : '#dc2626'}`,
                  }}
                >
                  {message.text}
                </div>
              )}

              {/* Model selection */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#e4e4e7' }}>
                  {t('settings.model')}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="openai/gpt-4o"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#fafafa',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Popular chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {POPULAR_MODELS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setModel(m.value)
                        if (m.provider === 'openrouter' && !apiBase) {
                          setApiBase('https://openrouter.ai/api/v1')
                        } else if (m.provider === 'ollama') {
                          setApiBase('http://localhost:11434')
                        }
                      }}
                      style={{
                        padding: '3px 9px',
                        fontSize: 11,
                        borderRadius: 6,
                        background: model === m.value ? '#ea580c' : '#27272a',
                        color: model === m.value ? '#ffffff' : '#a1a1aa',
                        border: '1px solid #3f3f46',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>
                    {t('settings.apiKey')}
                  </label>
                  {hasExistingKey && (
                    <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      ● Configurada ({maskedKey})
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={hasExistingKey ? 'Dejar en blanco para mantener la clave actual' : t('settings.apiKeyPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      color: '#fafafa',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#a1a1aa',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '4px',
                    }}
                    title={showKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showKey ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Custom API Base */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#e4e4e7' }}>
                  {t('settings.apiBase')}
                </label>
                <input
                  type="text"
                  value={apiBase}
                  onChange={e => setApiBase(e.target.value)}
                  placeholder={t('settings.apiBasePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#fafafa',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Temperature Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>
                    {t('settings.temperature')}
                  </label>
                  <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#e4e4e7',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 20px',
                    background: '#ea580c',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {saving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
