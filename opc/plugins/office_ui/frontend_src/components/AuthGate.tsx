import React, { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import './AuthGate.css'

export function AuthGate({ children }: { children: ReactNode }) {
  const {
    user,
    profile,
    loading,
    isBypassed,
    sendMagicLink,
    verifyOtp,
    signInWithPassword,
    signUpWithPassword,
    setBypassed,
  } = useAuth()
  const { t } = useI18n()

  const [authMode, setAuthMode] = useState<'magic_link' | 'otp_verify' | 'password' | 'signup'>('magic_link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner"></div>
        <p className="auth-loading-text">Verificando sesión de MonoCrom...</p>
      </div>
    )
  }

  // If user is authenticated or has bypassed in offline mode, show the app
  if ((user && profile?.is_authorized) || isBypassed) {
    return <>{children}</>
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSubmitting(true)
    setMessage(null)

    const { error } = await sendMagicLink(email)
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } else {
      setMessage({
        type: 'success',
        text: '¡Enlace enviado! Revisa tu bandeja de entrada o introduce el código de 6 dígitos que te llegó.',
      })
      setAuthMode('otp_verify')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !otpToken.trim()) return
    setIsSubmitting(true)
    setMessage(null)

    const { error } = await verifyOtp(email, otpToken)
    setIsSubmitting(false)

    if (error) {
      setMessage({ type: 'error', text: `Código inválido o expirado: ${error.message}` })
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setIsSubmitting(true)
    setMessage(null)

    if (authMode === 'password') {
      const { error } = await signInWithPassword(email, password)
      setIsSubmitting(false)
      if (error) {
        setMessage({ type: 'error', text: `Error al iniciar sesión: ${error.message}` })
      }
    } else {
      const { error } = await signUpWithPassword(email, password)
      setIsSubmitting(false)
      if (error) {
        setMessage({ type: 'error', text: `Error al registrarse: ${error.message}` })
      } else {
        setMessage({
          type: 'success',
          text: 'Cuenta creada con éxito. Revisa tu correo para confirmar si es requerido.',
        })
      }
    }
  }

  return (
    <div className="auth-gate-container">
      <div className="auth-gate-backdrop" />
      <div className="auth-gate-card">
        <div className="auth-gate-header">
          <div className="auth-gate-logo">
            <span className="auth-logo-text">
              Mono<span className="auth-logo-accent">Crom</span>
            </span>
            <span className="auth-logo-badge">Beta Privada</span>
          </div>
          <h2 className="auth-gate-title">Bienvenido a tu Empresa de Uno</h2>
          <p className="auth-gate-subtitle">
            Ingresa con tu correo registrado para activar tu espacio de trabajo de agentes autónomos.
          </p>
        </div>

        <div className="auth-gate-tabs">
          <button
            type="button"
            className={`auth-tab ${authMode === 'magic_link' || authMode === 'otp_verify' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('magic_link')
              setMessage(null)
            }}
          >
            ✉️ Enlace Mágico / OTP
          </button>
          <button
            type="button"
            className={`auth-tab ${authMode === 'password' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('password')
              setMessage(null)
            }}
          >
            🔑 Contraseña
          </button>
          <button
            type="button"
            className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('signup')
              setMessage(null)
            }}
          >
            ✨ Registro
          </button>
        </div>

        {message && (
          <div className={`auth-gate-alert ${message.type}`}>
            {message.type === 'success' ? '✅ ' : '⚠️ '}
            {message.text}
          </div>
        )}

        {authMode === 'magic_link' && (
          <form className="auth-form" onSubmit={handleSendMagicLink}>
            <div className="auth-form-group">
              <label htmlFor="auth-email">Correo Electrónico</label>
              <input
                id="auth-email"
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando enlace...' : 'Enviar Enlace de Acceso'}
            </button>
          </form>
        )}

        {authMode === 'otp_verify' && (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="auth-form-group">
              <label htmlFor="auth-otp">Código de 6 Dígitos</label>
              <input
                id="auth-otp"
                type="text"
                required
                placeholder="123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                maxLength={8}
                className="auth-otp-input"
              />
            </div>
            <div className="auth-actions-row">
              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Verificando...' : 'Verificar y Entrar'}
              </button>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => setAuthMode('magic_link')}
              >
                Reenviar correo
              </button>
            </div>
          </form>
        )}

        {(authMode === 'password' || authMode === 'signup') && (
          <form className="auth-form" onSubmit={handlePasswordAuth}>
            <div className="auth-form-group">
              <label htmlFor="auth-pwd-email">Correo Electrónico</label>
              <input
                id="auth-pwd-email"
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="auth-form-group">
              <label htmlFor="auth-password">Contraseña</label>
              <input
                id="auth-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting
                ? 'Procesando...'
                : authMode === 'password'
                ? 'Iniciar Sesión'
                : 'Crear Cuenta'}
            </button>
          </form>
        )}

        <div className="auth-gate-footer">
          <button
            type="button"
            className="auth-offline-btn"
            onClick={() => setBypassed(true)}
            title="Usar MonoCrom en modo desarrollo local sin conexión a internet"
          >
            🛠️ Omitir / Modo Desarrollador Offline
          </button>
        </div>
      </div>
    </div>
  )
}
