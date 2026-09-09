document.addEventListener('DOMContentLoaded', () => {
  // 1. Platform Switching (Terminal)
  const btnMac = document.getElementById('btn-mac')
  const btnWin = document.getElementById('btn-win')
  const cmdText = document.getElementById('cmd-text')
  const promptSym = document.getElementById('prompt-sym')
  const copyBtn = document.getElementById('copy-btn')
  const copyLabel = document.getElementById('copy-label')
  const copyIcon = document.getElementById('copy-icon')

  const COMMANDS = {
    mac: 'curl -fsSL https://raw.githubusercontent.com/cfarias73/monocrom2/main/landing/install.sh | bash',
    win: 'irm https://raw.githubusercontent.com/cfarias73/monocrom2/main/landing/install.ps1 | iex',
  }

  function setPlatform(plat) {
    if (plat === 'mac') {
      btnMac.classList.add('active')
      btnWin.classList.remove('active')
      cmdText.textContent = COMMANDS.mac
      promptSym.textContent = '$'
    } else {
      btnWin.classList.add('active')
      btnMac.classList.remove('active')
      cmdText.textContent = COMMANDS.win
      promptSym.textContent = '>'
    }
  }

  btnMac.addEventListener('click', () => setPlatform('mac'))
  btnWin.addEventListener('click', () => setPlatform('win'))

  // 2. Clipboard Copy
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cmdText.textContent.trim())
      copyLabel.textContent = '¡COPIADO!'
      copyIcon.textContent = '✓'
      copyBtn.style.borderColor = 'var(--accent-phosphor)'
      copyBtn.style.color = 'var(--accent-phosphor)'

      setTimeout(() => {
        copyLabel.textContent = 'COPIAR'
        copyIcon.textContent = '⎘'
        copyBtn.style.borderColor = ''
        copyBtn.style.color = ''
      }, 2000)
    } catch (e) {
      console.error(e)
    }
  })

  // 3. Interactive Use Cases
  const USECASES = {
    software: {
      goal: 'OBJETIVO: "Construir API REST con autenticación JWT y tests"',
      time: 'TURNO: 1 • 3 AGENTES EN EJECUCIÓN',
      rows: [
        { agent: '👑 [DIRECTOR]:', cls: 'chat-director', text: '"Arquitecto, prepara la estructura del proyecto y define contratos de endpoints."' },
        { agent: '👨‍💻 [DEV AGENT]:', cls: 'chat-dev', text: '"Escribiendo endpoints en Python FastAPI. Creando modelos Pydantic y base SQLite..."' },
        { agent: '🔍 [QA AGENT]:', cls: 'chat-qa', text: '"Ejecutando suite pytest. 14/14 tests aprobados. Generando reporte de cobertura..."' },
        { isStatus: true, text: '✓ TAREA COMPLETADA — Archivos guardados en tu espacio local <code>_workplace/api_auth/</code>' }
      ]
    },
    marketing: {
      goal: 'OBJETIVO: "Lanzar campaña en X e Instagram sobre nuevo feature"',
      time: 'TURNO: 1 • 2 AGENTES EN EJECUCIÓN',
      rows: [
        { agent: '👑 [DIRECTOR]:', cls: 'chat-director', text: '"Copywriter, redacta 3 variantes de posts con gancho y hashtags optimizados."' },
        { agent: '✍️ [COPY AGENT]:', cls: 'chat-dev', text: '"Borradores listos: Versión A (Storytelling), Versión B (Data directa), Versión C (Meme)."' },
        { agent: '🎨 [DESIGN AGENT]:', cls: 'chat-qa', text: '"Generando infografía en SVG y exportando imágenes 1080x1080..."' },
        { isStatus: true, text: '✓ CONTENIDO LISTO — Guardado en <code>_workplace/campana_lanzamiento/</code>' }
      ]
    },
    analisis: {
      goal: 'OBJETIVO: "Analizar precios de 5 competidores y armar Excel comparativo"',
      time: 'TURNO: 1 • 2 AGENTES EN EJECUCIÓN',
      rows: [
        { agent: '👑 [DIRECTOR]:', cls: 'chat-director', text: '"Investigador, navega a los sitios web y extrae tablas de precios actuales."' },
        { agent: '🌐 [BROWSER AGENT]:', cls: 'chat-dev', text: '"Navegando con Playwright... Extrayendo planes Starter, Pro y Enterprise de 5 URLs."' },
        { agent: '📊 [DATA AGENT]:', cls: 'chat-qa', text: '"Compilando hoja de cálculo .xlsx con gráficos de dispersión y promedios."' },
        { isStatus: true, text: '✓ REPORTE GENERADO — Archivo <code>_workplace/analisis_precios.xlsx</code> disponible' }
      ]
    },
    soporte: {
      goal: 'OBJETIVO: "Monitorear bandeja de entrada y clasificar correos urgentes"',
      time: 'TURNO: 1 • 1 AGENTE EN EJECUCIÓN',
      rows: [
        { agent: '👑 [DIRECTOR]:', cls: 'chat-director', text: '"Soporte, revisa correos entrantes cada 60s vía IMAP y responde dudas comunes."' },
        { agent: '✉️ [EMAIL AGENT]:', cls: 'chat-dev', text: '"3 correos procesados: 2 consultas respondidas automáticamente, 1 cotización escalada a ti."' },
        { isStatus: true, text: '● MONITOREO ACTIVO — 0 incidentes bloqueados' }
      ]
    }
  }

  const ucTabs = document.querySelectorAll('.usecase-tab')
  const ucContent = document.getElementById('uc-content')

  ucTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      ucTabs.forEach(t => {
        t.classList.remove('active')
        t.querySelector('.tab-bullet').textContent = '□'
      })
      tab.classList.add('active')
      tab.querySelector('.tab-bullet').textContent = '■'

      const key = tab.dataset.usecase
      const data = USECASES[key]
      if (!data) return

      let html = `
        <div class="uc-header font-mono">
          <span class="uc-badge">${data.goal}</span>
          <span class="uc-time">${data.time}</span>
        </div>
        <div class="uc-chat-stream font-mono">
      `

      data.rows.forEach(r => {
        if (r.isStatus) {
          html += `<div class="chat-row chat-status"><span class="status-pill">●</span> ${r.text}</div>`
        } else {
          html += `
            <div class="chat-row ${r.cls}">
              <span class="chat-agent">${r.agent}</span> ${r.text}
            </div>
          `
        }
      })

      html += `</div>`
      ucContent.innerHTML = html
    })
  })

  // 4. FAQ Accordion
  const faqCards = document.querySelectorAll('.faq-card')
  faqCards.forEach(card => {
    const btn = card.querySelector('.faq-toggle')
    btn.addEventListener('click', () => {
      const isOpen = card.classList.contains('open')
      faqCards.forEach(c => c.classList.remove('open'))
      if (!isOpen) {
        card.classList.add('open')
      }
    })
  })

  // 5. Supabase Beta Signup
  const SUPABASE_URL = 'https://pgqcleckswtztriqqmil.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncWNsZWNrc3d0enRyaXFxbWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Nzk0NzMsImV4cCI6MjEwNDU1NTQ3M30.i1go2K3SlnRFtB5HThUerwBuQ-ufNhh4B05F5vHag4s'

  const betaForm = document.getElementById('landing-beta-form')
  const emailInput = document.getElementById('landing-email-input')
  const submitBtn = document.getElementById('landing-submit-btn')
  const betaMsg = document.getElementById('landing-beta-msg')

  if (betaForm && window.supabase) {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    betaForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = emailInput.value.trim()
      if (!email) return

      submitBtn.disabled = true
      submitBtn.textContent = 'PROCESANDO...'
      betaMsg.style.display = 'none'

      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        submitBtn.disabled = false
        submitBtn.textContent = '✉️ SOLICITAR INVITACIÓN / ACCESO'

        if (error) {
          betaMsg.style.display = 'block'
          betaMsg.style.background = 'rgba(239, 68, 68, 0.15)'
          betaMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)'
          betaMsg.style.color = '#f87171'
          betaMsg.textContent = `Error: ${error.message}`
        } else {
          betaMsg.style.display = 'block'
          betaMsg.style.background = 'rgba(60, 179, 113, 0.15)'
          betaMsg.style.border = '1px solid rgba(60, 179, 113, 0.4)'
          betaMsg.style.color = '#4ade80'
          betaMsg.textContent = '¡Listo! Te hemos enviado un enlace de acceso a tu correo para activar tu cuenta de beta tester.'
          emailInput.value = ''
        }
      } catch (err) {
        submitBtn.disabled = false
        submitBtn.textContent = '✉️ SOLICITAR INVITACIÓN / ACCESO'
        betaMsg.style.display = 'block'
        betaMsg.style.background = 'rgba(239, 68, 68, 0.15)'
        betaMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)'
        betaMsg.style.color = '#f87171'
        betaMsg.textContent = `Error inesperado: ${err.message || err}`
      }
    })
  }
})

