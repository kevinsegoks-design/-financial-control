'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Obligation, PersonalMember } from '@/types/database'
import { fmtUSD } from '@/lib/format'

interface Props {
  obligations: Obligation[]
  members: PersonalMember[]
  workspaceId: string
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Arriendo Casa': '🏠',
  'Arriendo Local': '🏢',
  'Agua': '💧',
  'Luz': '⚡',
  'Gas': '🔥',
  'Teléfono': '📱',
  'Internet': '🌐',
  'Cuota Vehículo': '🚗',
  'Gasolina': '⛽',
  'Salud': '🏥',
  'Educación': '🎓',
  'Alimentación': '🍽️',
  'Seguros': '🛡️',
  'Entretenimiento': '🎬',
  'Otros': '📦',
}

const CATEGORIES = Object.keys(CATEGORY_EMOJIS)

const QUICK_SUGGESTIONS = [
  { name: 'Agua', category: 'Agua' },
  { name: 'Luz / Electricidad', category: 'Luz' },
  { name: 'Teléfono / Internet', category: 'Internet' },
  { name: 'Arriendo Casa Cuenca', category: 'Arriendo Casa' },
  { name: 'Arriendo Casa Guayaquil', category: 'Arriendo Casa' },
  { name: 'Arriendo Local', category: 'Arriendo Local' },
  { name: 'Cuota del Carro', category: 'Cuota Vehículo' },
  { name: 'Gasolina', category: 'Gasolina' },
  { name: 'Seguro Médico', category: 'Seguros' },
  { name: 'Colegiatura', category: 'Educación' },
]

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Mensual', bimonthly: 'Bimestral',
  quarterly: 'Trimestral', annual: 'Anual', weekly: 'Semanal',
}

function catEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? '📦'
}

const EMPTY_FORM = {
  name: '', category: 'Arriendo Casa', amount: '',
  is_variable: false, due_day: '1', frequency: 'monthly',
  personal_member_id: '',
}

export default function ObligationsClient({ obligations, members, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState({
    name: '', category: '', amount: '', due_day: '', frequency: 'monthly',
    personal_member_id: '',
  })

  const totalMonthly = useMemo(
    () => obligations
      .filter(o => o.status === 'active' && o.frequency === 'monthly')
      .reduce((s, o) => s + o.amount, 0),
    [obligations]
  )

  const byCategory = useMemo(
    () => obligations
      .filter(o => o.status === 'active')
      .reduce((acc, o) => {
        const key = o.category
        if (!acc[key]) acc[key] = []
        acc[key].push(o)
        return acc
      }, {} as Record<string, Obligation[]>),
    [obligations]
  )

  async function handleSave() {
    if (!form.name || !form.amount) return
    setLoading(true)
    await supabase.from('obligations').insert({
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
    setShowForm(false)
    setForm(EMPTY_FORM)
    router.refresh()
  }

  async function handleEditSave(id: string) {
    setLoading(true)
    await supabase.from('obligations').update({
      name: editForm.name,
      category: editForm.category,
      amount: parseFloat(editForm.amount),
      due_day: editForm.due_day ? parseInt(editForm.due_day) : null,
      frequency: editForm.frequency,
      personal_member_id: editForm.personal_member_id || null,
    }).eq('id', id)
    setLoading(false)
    setEditId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto fijo?')) return
    await supabase.from('obligations').update({ status: 'inactive' }).eq('id', id)
    router.refresh()
  }

  function openEdit(obl: Obligation) {
    setEditId(obl.id)
    setEditForm({
      name: obl.name,
      category: obl.category,
      amount: String(obl.amount),
      due_day: obl.due_day ? String(obl.due_day) : '',
      frequency: obl.frequency,
      personal_member_id: obl.personal_member_id ?? '',
    })
  }

  function quickAdd(s: typeof QUICK_SUGGESTIONS[0]) {
    setForm(f => ({ ...f, name: s.name, category: s.category }))
    setShowForm(true)
    setShowSuggestions(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Gastos Fijos</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Total mensual: <span style={{ color: '#FF6B9D', fontWeight: 700 }}>{fmtUSD(totalMonthly)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowSuggestions(v => !v)}
            style={{ background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.2)', color: '#FF6B9D', borderRadius: 10, padding: '8px 10px', fontSize: 13, cursor: 'pointer' }}
          >✨</button>
          <button
            onClick={() => { setShowForm(!showForm); setShowSuggestions(false) }}
            style={{ background: 'rgba(255,107,157,0.15)', border: '1px solid rgba(255,107,157,0.3)', color: '#FF6B9D', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >{showForm ? 'Cancelar' : '+ Nuevo'}</button>
        </div>
      </div>

      {/* Quick suggestions */}
      {showSuggestions && (
        <div className="glass fade-up" style={{ padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>Sugerencias rápidas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {QUICK_SUGGESTIONS.map(s => (
              <button key={s.name} onClick={() => quickAdd(s)} style={{ background: 'rgba(255,107,157,0.08)', border: '1px solid rgba(255,107,157,0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{catEmoji(s.category)}</span> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="glass fade-up" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            {catEmoji(form.category)} Nuevo gasto fijo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-glass" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="input-glass"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
              >
                {CATEGORIES.map(c => <option key={c}>{catEmoji(c)} {c}</option>)}
              </select>
              <select
                className="input-glass"
                value={form.personal_member_id}
                onChange={e => setForm(f => ({ ...f, personal_member_id: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
              >
                <option value="">Compartida</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" type="number" placeholder="Monto" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: 1 }} />
              <input className="input-glass" type="number" placeholder="Día venc." min={1} max={31} value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} style={{ maxWidth: 90 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                className="input-glass"
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
              >
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
                <option value="weekly">Semanal</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={form.is_variable} onChange={e => setForm(f => ({ ...f, is_variable: e.target.checked }))} />
                Variable
              </label>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !form.name || !form.amount}
              style={{ background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.4)', borderRadius: 10, padding: '11px', color: '#FF6B9D', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading || !form.name || !form.amount ? 0.5 : 1 }}
            >{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* List */}
      {Object.keys(byCategory).length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>📋</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Agrega tus gastos fijos recurrentes</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Toca ✨ para ver sugerencias comunes</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
              {catEmoji(cat)} {cat}
            </h3>
            <div className="glass" style={{ overflow: 'hidden' }}>
              {items.map((obl, i) => {
                const isEditingThis = editId === obl.id
                const borderStyle = i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                return (
                  <div key={obl.id}>
                    {isEditingThis ? (
                      <div style={{ padding: '12px 14px', borderBottom: borderStyle, background: 'rgba(255,107,157,0.04)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input className="input-glass" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre" />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input className="input-glass" type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: 1 }} placeholder="Monto" />
                            <input className="input-glass" type="number" value={editForm.due_day} onChange={e => setEditForm(f => ({ ...f, due_day: e.target.value }))} style={{ maxWidth: 80 }} placeholder="Día" />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <select
                              className="input-glass"
                              value={editForm.category}
                              onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
                            >
                              {CATEGORIES.map(c => <option key={c}>{catEmoji(c)} {c}</option>)}
                            </select>
                            <select
                              className="input-glass"
                              value={editForm.personal_member_id}
                              onChange={e => setEditForm(f => ({ ...f, personal_member_id: e.target.value }))}
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
                            >
                              <option value="">Compartida</option>
                              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={() => handleEditSave(obl.id)} disabled={loading} style={{ background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 8, padding: '7px 18px', color: '#30D158', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Guardar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: borderStyle }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{catEmoji(obl.category)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{obl.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {obl.personal_member?.name ?? 'Compartida'} · día {obl.due_day} · {FREQ_LABEL[obl.frequency] ?? obl.frequency}
                            {obl.is_variable ? ' · Variable' : ''}
                          </p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#FF6B9D', flexShrink: 0 }}>{fmtUSD(obl.amount)}</p>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => openEdit(obl)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => handleDelete(obl.id)} style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.15)', borderRadius: 7, padding: '5px 8px', fontSize: 12, cursor: 'pointer', color: '#FF453A' }}>🗑</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
