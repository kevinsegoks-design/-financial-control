'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Obligation, PersonalMember } from '@/types/database'

interface Props {
  obligations: Obligation[]
  members: PersonalMember[]
  workspaceId: string
}

const CATEGORIES = ['Vivienda', 'Servicios', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Alimentación', 'Seguros', 'Comunicación', 'Otros']
const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export default function ObligationsClient({ obligations, members, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'Servicios', amount: '',
    is_variable: false, due_day: '1', frequency: 'monthly',
    personal_member_id: '',
  })

  const totalMonthly = obligations.filter(o => o.status === 'active' && o.frequency === 'monthly').reduce((s, o) => s + o.amount, 0)

  async function handleSave() {
    if (!form.name || !form.amount) return
    setLoading(true)
    const { error } = await supabase.from('obligations').insert({
      workspace_id: workspaceId,
      personal_member_id: form.personal_member_id || null,
      name: form.name,
      category: form.category,
      amount: parseFloat(form.amount),
      is_variable: form.is_variable,
      due_day: form.due_day ? parseInt(form.due_day) : null,
      frequency: form.frequency,
    })
    setLoading(false)
    if (!error) { setShowForm(false); router.refresh() }
  }

  const byCategory = obligations.reduce((acc, o) => {
    if (!acc[o.category]) acc[o.category] = []
    acc[o.category].push(o)
    return acc
  }, {} as Record<string, Obligation[]>)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Gastos Fijos</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Total mensual: <span style={{ color: '#FF6B9D', fontWeight: 700 }}>{fmtMXN(totalMonthly)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'rgba(255,107,157,0.15)', border: '1px solid rgba(255,107,157,0.3)',
            color: '#FF6B9D', borderRadius: 10, padding: '8px 14px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass fade-up" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nueva obligación</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-glass" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="input-glass" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="input-glass" value={form.personal_member_id} onChange={e => setForm(f => ({ ...f, personal_member_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                <option value="">Compartida</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" type="number" placeholder="Monto" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <input className="input-glass" type="number" placeholder="Día venc." min={1} max={31} value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} style={{ maxWidth: 90 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="input-glass" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
                <option value="weekly">Semanal</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_variable} onChange={e => setForm(f => ({ ...f, is_variable: e.target.checked }))} />
                Variable
              </label>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !form.name || !form.amount}
              style={{
                background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.4)',
                borderRadius: 10, padding: '11px', color: '#FF6B9D',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: loading || !form.name || !form.amount ? 0.5 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* List by category */}
      {Object.keys(byCategory).length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 28 }}>📋</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Agrega tus gastos fijos recurrentes</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
              {cat}
            </h3>
            <div className="glass" style={{ overflow: 'hidden' }}>
              {items.map((obl, i) => (
                <div key={obl.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{obl.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {obl.personal_member?.name ?? 'Compartida'} · día {obl.due_day} · {obl.frequency === 'monthly' ? 'Mensual' : obl.frequency}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#FF6B9D' }}>{fmtMXN(obl.amount)}</p>
                    {obl.is_variable && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>variable</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
