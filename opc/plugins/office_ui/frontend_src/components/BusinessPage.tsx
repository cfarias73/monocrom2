import { useState, useEffect, useCallback } from 'react'
import './BusinessPage.css'

// ── Types ─────────────────────────────────────────────────────────────────

interface BMCData {
  key_partners: string
  key_activities: string
  key_resources: string
  value_proposition: string
  customer_relationships: string
  channels: string
  customer_segments: string
  cost_structure: string
  revenue_streams: string
  company_name: string
  company_description: string
}

interface KPI {
  name: string
  target: string
  unit: string
}

interface JobRole {
  role_id: string
  role_name: string
  job_description: string
  responsibilities: string
  kpis: KPI[]
}

interface JobData {
  roles: JobRole[]
}

const EMPTY_BMC: BMCData = {
  company_name: '', company_description: '',
  key_partners: '', key_activities: '', key_resources: '',
  value_proposition: '', customer_relationships: '', channels: '',
  customer_segments: '', cost_structure: '', revenue_streams: '',
}

const EMPTY_JOBS: JobData = { roles: [] }

// ── BusinessPage ──────────────────────────────────────────────────────────

export function BusinessPage() {
  const [activeTab, setActiveTab] = useState<'bmc' | 'jobs'>('bmc')
  const [bmc, setBmc] = useState<BMCData>(EMPTY_BMC)
  const [jobs, setJobs] = useState<JobData>(EMPTY_JOBS)
  const [bmcSaving, setBmcSaving] = useState(false)
  const [jobsSaving, setJobsSaving] = useState(false)
  const [bmcSaved, setBmcSaved] = useState(false)
  const [jobsSaved, setJobsSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load both datasets
  useEffect(() => {
    Promise.all([
      fetch('/api/config/bmc').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/config/jobs').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([bmcData, jobsData]) => {
      if (bmcData) setBmc(bmcData)
      if (jobsData) setJobs(jobsData)
      setLoading(false)
    })
  }, [])

  const saveBmc = useCallback(async () => {
    setBmcSaving(true)
    try {
      await fetch('/api/config/bmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bmc),
      })
      setBmcSaved(true)
      setTimeout(() => setBmcSaved(false), 2500)
    } finally { setBmcSaving(false) }
  }, [bmc])

  const saveJobs = useCallback(async () => {
    setJobsSaving(true)
    try {
      await fetch('/api/config/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobs),
      })
      setJobsSaved(true)
      setTimeout(() => setJobsSaved(false), 2500)
    } finally { setJobsSaving(false) }
  }, [jobs])

  const updateBmc = (field: keyof BMCData, value: string) =>
    setBmc(prev => ({ ...prev, [field]: value }))

  const addRole = () => setJobs(prev => ({
    roles: [...prev.roles, {
      role_id: `role_${Date.now()}`,
      role_name: '',
      job_description: '',
      responsibilities: '',
      kpis: [],
    }]
  }))

  const updateRole = (idx: number, field: keyof JobRole, value: string) =>
    setJobs(prev => ({ roles: prev.roles.map((r, i) => i === idx ? { ...r, [field]: value } : r) }))

  const deleteRole = (idx: number) =>
    setJobs(prev => ({ roles: prev.roles.filter((_, i) => i !== idx) }))

  const addKpi = (roleIdx: number) =>
    setJobs(prev => ({
      roles: prev.roles.map((r, i) => i === roleIdx
        ? { ...r, kpis: [...r.kpis, { name: '', target: '', unit: '' }] }
        : r)
    }))

  const updateKpi = (roleIdx: number, kpiIdx: number, field: keyof KPI, value: string) =>
    setJobs(prev => ({
      roles: prev.roles.map((r, i) => i === roleIdx
        ? { ...r, kpis: r.kpis.map((k, j) => j === kpiIdx ? { ...k, [field]: value } : k) }
        : r)
    }))

  const deleteKpi = (roleIdx: number, kpiIdx: number) =>
    setJobs(prev => ({
      roles: prev.roles.map((r, i) => i === roleIdx
        ? { ...r, kpis: r.kpis.filter((_, j) => j !== kpiIdx) }
        : r)
    }))

  if (loading) return <div className="bp-loading">Cargando configuración de empresa…</div>

  return (
    <div className="bp-root">
      {/* Sub-navigation */}
      <div className="bp-tabs">
        <button className={`bp-tab ${activeTab === 'bmc' ? 'bp-tab--active' : ''}`} onClick={() => setActiveTab('bmc')}>
          <span className="bp-tab-icon">🧩</span> Business Model Canvas
        </button>
        <button className={`bp-tab ${activeTab === 'jobs' ? 'bp-tab--active' : ''}`} onClick={() => setActiveTab('jobs')}>
          <span className="bp-tab-icon">👔</span> Roles &amp; KPIs
        </button>
        <div className="bp-context-badge" title="Estos datos alimentan automáticamente el contexto de tus agentes">
          ⚡ Contexto activo para agentes
        </div>
      </div>

      {/* ── BMC Tab ── */}
      {activeTab === 'bmc' && (
        <div className="bp-content">
          <div className="bp-section-header">
            <div>
              <h2 className="bp-section-title">Business Model Canvas</h2>
              <p className="bp-section-desc">Define el modelo de negocio. Los agentes usarán este contexto para dar respuestas alineadas a tu empresa.</p>
            </div>
            <button className="bp-save-btn" onClick={saveBmc} disabled={bmcSaving}>
              {bmcSaving ? 'Guardando…' : bmcSaved ? '✅ Guardado' : '💾 Guardar Canvas'}
            </button>
          </div>

          {/* Company info */}
          <div className="bp-company-row">
            <div className="bp-field">
              <label className="bp-label">Nombre de la Empresa</label>
              <input className="bp-input" value={bmc.company_name} onChange={e => updateBmc('company_name', e.target.value)} placeholder="ej. MonoCrom SAS" />
            </div>
            <div className="bp-field bp-field--wide">
              <label className="bp-label">Descripción / Misión</label>
              <input className="bp-input" value={bmc.company_description} onChange={e => updateBmc('company_description', e.target.value)} placeholder="Tu empresa de uno con agentes de IA…" />
            </div>
          </div>

          {/* BMC Grid */}
          <div className="bp-canvas">
            {/* Row 1: Partners | Activities + Resources | VP | Relations | Segments */}
            <div className="bp-cell bp-cell--partners bp-cell--tall">
              <div className="bp-cell-header">🤝 Socios Clave</div>
              <textarea className="bp-cell-text" value={bmc.key_partners} onChange={e => updateBmc('key_partners', e.target.value)} placeholder="Proveedores, aliados estratégicos, distribuidores…" />
            </div>

            <div className="bp-cell-stack">
              <div className="bp-cell">
                <div className="bp-cell-header">⚡ Actividades Clave</div>
                <textarea className="bp-cell-text" value={bmc.key_activities} onChange={e => updateBmc('key_activities', e.target.value)} placeholder="¿Qué hace tu empresa para entregar valor?" />
              </div>
              <div className="bp-cell">
                <div className="bp-cell-header">🏭 Recursos Clave</div>
                <textarea className="bp-cell-text" value={bmc.key_resources} onChange={e => updateBmc('key_resources', e.target.value)} placeholder="Activos físicos, intelectuales, humanos, financieros…" />
              </div>
            </div>

            <div className="bp-cell bp-cell--vp bp-cell--tall">
              <div className="bp-cell-header">💎 Propuesta de Valor</div>
              <textarea className="bp-cell-text bp-cell-text--large" value={bmc.value_proposition} onChange={e => updateBmc('value_proposition', e.target.value)} placeholder="¿Qué problema resuelves? ¿Qué valor único ofreces a tus clientes?" />
            </div>

            <div className="bp-cell-stack">
              <div className="bp-cell">
                <div className="bp-cell-header">❤️ Relación con Clientes</div>
                <textarea className="bp-cell-text" value={bmc.customer_relationships} onChange={e => updateBmc('customer_relationships', e.target.value)} placeholder="Autoservicio, asistencia personal, comunidad…" />
              </div>
              <div className="bp-cell">
                <div className="bp-cell-header">📡 Canales</div>
                <textarea className="bp-cell-text" value={bmc.channels} onChange={e => updateBmc('channels', e.target.value)} placeholder="Web, redes sociales, distribuidores, tienda…" />
              </div>
            </div>

            <div className="bp-cell bp-cell--segments bp-cell--tall">
              <div className="bp-cell-header">🎯 Segmentos de Clientes</div>
              <textarea className="bp-cell-text" value={bmc.customer_segments} onChange={e => updateBmc('customer_segments', e.target.value)} placeholder="Mercado masivo, nicho, multi-sided, B2B, B2C…" />
            </div>

            {/* Row 2: Costs | Revenue */}
            <div className="bp-cell bp-cell--costs">
              <div className="bp-cell-header">💸 Estructura de Costos</div>
              <textarea className="bp-cell-text" value={bmc.cost_structure} onChange={e => updateBmc('cost_structure', e.target.value)} placeholder="Costos fijos, variables, economías de escala…" />
            </div>
            <div className="bp-cell bp-cell--revenue">
              <div className="bp-cell-header">💰 Fuentes de Ingresos</div>
              <textarea className="bp-cell-text" value={bmc.revenue_streams} onChange={e => updateBmc('revenue_streams', e.target.value)} placeholder="Venta directa, suscripción, licencias, comisiones…" />
            </div>
          </div>
        </div>
      )}

      {/* ── Jobs Tab ── */}
      {activeTab === 'jobs' && (
        <div className="bp-content">
          <div className="bp-section-header">
            <div>
              <h2 className="bp-section-title">Roles, Job Descriptions &amp; KPIs</h2>
              <p className="bp-section-desc">Cada agente conocerá su descripción y métricas de éxito antes de actuar.</p>
            </div>
            <div className="bp-header-actions">
              <button className="bp-add-btn" onClick={addRole}>+ Agregar Rol</button>
              <button className="bp-save-btn" onClick={saveJobs} disabled={jobsSaving}>
                {jobsSaving ? 'Guardando…' : jobsSaved ? '✅ Guardado' : '💾 Guardar Roles'}
              </button>
            </div>
          </div>

          {jobs.roles.length === 0 && (
            <div className="bp-empty">
              <div className="bp-empty-icon">👔</div>
              <div className="bp-empty-text">No hay roles configurados aún</div>
              <div className="bp-empty-sub">Agrega roles para que tus agentes conozcan sus responsabilidades y KPIs</div>
              <button className="bp-add-btn bp-add-btn--lg" onClick={addRole}>+ Agregar primer rol</button>
            </div>
          )}

          <div className="bp-roles">
            {jobs.roles.map((role, ri) => (
              <div key={role.role_id} className="bp-role-card">
                <div className="bp-role-header">
                  <input
                    className="bp-role-name"
                    value={role.role_name}
                    onChange={e => updateRole(ri, 'role_name', e.target.value)}
                    placeholder="Nombre del rol (ej. Secretaria, Director Comercial…)"
                  />
                  <button className="bp-delete-btn" onClick={() => deleteRole(ri)} title="Eliminar rol">🗑</button>
                </div>

                <div className="bp-role-fields">
                  <div className="bp-field">
                    <label className="bp-label">Descripción del Puesto</label>
                    <textarea
                      className="bp-textarea"
                      rows={3}
                      value={role.job_description}
                      onChange={e => updateRole(ri, 'job_description', e.target.value)}
                      placeholder="¿Cuál es el propósito de este rol en la organización?"
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Responsabilidades Principales</label>
                    <textarea
                      className="bp-textarea"
                      rows={3}
                      value={role.responsibilities}
                      onChange={e => updateRole(ri, 'responsibilities', e.target.value)}
                      placeholder="- Gestionar correo y agenda&#10;- Redactar comunicaciones&#10;- Coordinar proveedores…"
                    />
                  </div>
                </div>

                <div className="bp-kpi-section">
                  <div className="bp-kpi-header">
                    <span className="bp-kpi-title">📊 KPIs</span>
                    <button className="bp-kpi-add" onClick={() => addKpi(ri)}>+ KPI</button>
                  </div>
                  {role.kpis.length === 0 && (
                    <div className="bp-kpi-empty">Sin KPIs — agrega métricas de éxito para este rol</div>
                  )}
                  <div className="bp-kpis">
                    {role.kpis.map((kpi, ki) => (
                      <div key={ki} className="bp-kpi-row">
                        <input className="bp-kpi-input bp-kpi-name" value={kpi.name} onChange={e => updateKpi(ri, ki, 'name', e.target.value)} placeholder="Métrica" />
                        <input className="bp-kpi-input bp-kpi-target" value={kpi.target} onChange={e => updateKpi(ri, ki, 'target', e.target.value)} placeholder="Meta" />
                        <input className="bp-kpi-input bp-kpi-unit" value={kpi.unit} onChange={e => updateKpi(ri, ki, 'unit', e.target.value)} placeholder="Unidad" />
                        <button className="bp-kpi-del" onClick={() => deleteKpi(ri, ki)} title="Eliminar KPI">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
