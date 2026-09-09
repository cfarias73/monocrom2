import React, { useState, useRef, useEffect, type ReactElement } from 'react'
import { useAuth } from '../context/AuthContext'
import './UserAccountPill.css'

export function UserAccountPill(): ReactElement {
  const { user, profile, isBypassed, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isBypassed) {
    return (
      <div className="user-account-container" ref={menuRef}>
        <button
          type="button"
          className="user-account-pill offline"
          onClick={() => setIsOpen(!isOpen)}
          title="Modo Desarrollador Local (Sin conexión a Supabase)"
        >
          <span className="user-status-dot offline" />
          <span className="user-email-text">Dev Local</span>
          <span className="user-plan-badge offline">Offline</span>
        </button>

        {isOpen && (
          <div className="user-account-dropdown">
            <div className="user-dropdown-header">
              <div className="user-dropdown-email">Modo Local / Desconectado</div>
              <div className="user-dropdown-plan">Acceso de desarrollo sin cuenta de Supabase</div>
            </div>
            <button
              type="button"
              className="user-dropdown-logout-btn"
              onClick={() => {
                setIsOpen(false)
                signOut()
              }}
            >
              🔒 Iniciar Sesión con Supabase
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!user) return <span />

  const emailDisplay = user.email || 'Usuario'
  const planName = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'enterprise' ? 'Enterprise' : 'Beta'

  return (
    <div className="user-account-container" ref={menuRef}>
      <button
        type="button"
        className="user-account-pill"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú de cuenta"
      >
        <span className="user-status-dot online" />
        <span className="user-email-text">{emailDisplay}</span>
        <span className={`user-plan-badge ${profile?.plan || 'beta'}`}>
          {planName}
        </span>
      </button>

      {isOpen && (
        <div className="user-account-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-title">Cuenta Conectada</div>
            <div className="user-dropdown-email" title={user.email}>{user.email}</div>
            <div className="user-dropdown-plan-tag">
              ⚡ Plan Activo: <strong>{planName.toUpperCase()} TESTER</strong>
            </div>
          </div>
          <div className="user-dropdown-divider" />
          <button
            type="button"
            className="user-dropdown-logout-btn"
            onClick={() => {
              setIsOpen(false)
              signOut()
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  )
}
