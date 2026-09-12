import { useState, useEffect, useCallback } from 'react'
import './UpdateModal.css'

export interface UpdateInfo {
  success: boolean
  version?: string
  update_available: boolean
  current_sha: string
  latest_sha?: string
  latest_message?: string
  latest_date?: string
  latest_author?: string
  repo_url?: string
}

interface UpdateModalProps {
  isOpen: boolean
  onClose: () => void
  initialInfo?: UpdateInfo | null
  onUpdateCompleted?: () => void
}

export function UpdateModal({ isOpen, onClose, initialInfo, onUpdateCompleted }: UpdateModalProps) {
  const [info, setInfo] = useState<UpdateInfo | null>(initialInfo || null)
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'in_progress' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [updateResult, setUpdateResult] = useState<{sha_after?: string; code_changed?: boolean} | null>(null)

  const checkUpdates = useCallback(async () => {
    setChecking(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/update/check')
      if (res.ok) {
        const data: UpdateInfo = await res.json()
        setInfo(data)
      } else {
        setErrorMessage('No se pudo comprobar el estado del repositorio remoto.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al verificar actualizaciones.')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setUpdateStatus('idle')
      setErrorMessage(null)
      checkUpdates()
    }
  }, [isOpen, checkUpdates])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !updating) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, updating])

  if (!isOpen) return null

  const handleApplyUpdate = async () => {
    setUpdating(true)
    setUpdateStatus('in_progress')
    setErrorMessage(null)
    try {
      const res = await fetch('/api/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUpdateResult({ sha_after: data.sha_after, code_changed: data.code_changed })
        setUpdateStatus('success')
        if (onUpdateCompleted) onUpdateCompleted()
      } else {
        setUpdateStatus('error')
        setErrorMessage(data.error || 'Ocurrió un error al intentar aplicar la actualización.')
      }
    } catch (err: any) {
      setUpdateStatus('error')
      setErrorMessage(err.message || 'Error de red al aplicar la actualización.')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleString()
    } catch {
      return isoString
    }
  }

  return (
    <div className="update-modal-backdrop" onClick={() => !updating && onClose()}>
      <div className="update-modal" onClick={e => e.stopPropagation()}>
        <div className="update-modal-header">
          <div className="update-modal-title">
            <span>🚀</span> Actualizador del Sistema MonoCrom
          </div>
          <button className="update-modal-close" onClick={onClose} disabled={updating}>×</button>
        </div>

        <div className="update-modal-body">
          {/* Version Info Header */}
          <div className="update-version-card">
            <div className="update-version-col">
              <span className="update-version-label">Versión Local</span>
              <span className="update-version-val">
                {info?.version ? `v${info.version}` : ''} {info?.current_sha ? `(${info.current_sha})` : '...'}
              </span>
            </div>
            {info && (
              <span className={`update-badge-status ${info.update_available ? 'available' : 'latest'}`}>
                {info.update_available ? '⚡ Nueva versión disponible' : '✅ MonoCrom está al día'}
              </span>
            )}
          </div>

          {/* Release Notes / Latest Commit */}
          {info?.update_available && updateStatus !== 'success' && (
            <div className="update-notes-card">
              <div className="update-notes-title">
                <span>📝</span> Novedades de la actualización
              </div>
              <div className="update-notes-content">
                {info.latest_message || 'Mejoras y correcciones generales.'}
              </div>
              {info.latest_date && (
                <div className="update-notes-meta">
                  Publicado: {formatDate(info.latest_date)} {info.latest_author ? `por ${info.latest_author}` : ''} • Commit: <code>{info.latest_sha}</code>
                </div>
              )}
            </div>
          )}

          {/* Updating Progress */}
          {updateStatus === 'in_progress' && (
            <div className="update-progress-card">
              <div className="update-spinner" />
              <div style={{ fontWeight: 600, color: '#cad3f5' }}>
                Descargando e instalando actualización...
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a5adcb' }}>
                Esto descargará los últimos cambios desde GitHub y sincronizará los paquetes.
              </div>
            </div>
          )}

          {/* Success Card */}
          {updateStatus === 'success' && (
            <div className="update-success-card">
              <div className="update-success-title">
                <span>🎉</span> ¡MonoCrom se ha actualizado con éxito!
                {updateResult?.sha_after && <code style={{marginLeft: 6, fontSize: '0.78rem', opacity: 0.75}}>({updateResult.sha_after})</code>}
              </div>
              <div className="update-success-desc">
                <b>Pasos para ver la nueva versión:</b>
                <ol style={{margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7}}>
                  <li>Presiona el botón <b>Recargar Interfaz</b> de abajo.</li>
                  {updateResult?.code_changed && (
                    <li>Si los agentes se comportan igual de antes, <b>cierra la terminal y vuelve a abrir el acceso directo</b> de MonoCrom.</li>
                  )}
                </ol>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="update-error-card">
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        <div className="update-modal-footer">
          {updateStatus === 'success' ? (
            <button
              className="update-btn-action"
              onClick={() => {
                const cb = Date.now()
                window.location.href = `/?v=${cb}`
              }}
            >
              🔄 Recargar Interfaz
            </button>
          ) : (
            <>
              <button
                className="update-btn-cancel"
                onClick={onClose}
                disabled={updating}
              >
                Cerrar
              </button>

              {info?.update_available ? (
                <button
                  className="update-btn-action"
                  onClick={handleApplyUpdate}
                  disabled={updating}
                >
                  <span>⚡</span> {updating ? 'Actualizando...' : 'Actualizar MonoCrom Ahora'}
                </button>
              ) : (
                <button
                  className="update-btn-action"
                  onClick={checkUpdates}
                  disabled={checking}
                  style={{ background: '#363a4f' }}
                >
                  {checking ? 'Comprobando...' : '🔍 Buscar Actualizaciones'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
