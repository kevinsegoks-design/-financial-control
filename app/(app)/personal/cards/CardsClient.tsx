'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CreditCard, Bank, PersonalMember } from '@/types/database'
import ProgressRing from '@/components/ui/ProgressRing'

interface Props {
  cards: CreditCard[]
  banks: Bank[]
  members: PersonalMember[]
  workspaceId: string
}

const ACCENT_COLORS = ['#FFD60A', '#FF6B9D', '#9D7BFF', '#30D158', '#0A84FF', '#FF9F0A']

export default function CardsClient({ cards, banks, members, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    bank_id: '', holder: 'Kevin', nickname: '', last_four: '',
    credit_limit: '', cut_day: '1', payment_due_day: '20',
    interest_rate: '', rewards_type: '', accent_color: '#FFD60A', notes: '',
    personal_member_id: '',
  })

  const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

  async function handleSave() {
    if (!form.bank_id || !form.credit_limit) return
    setLoading(true)
    const { error } = await supabase.from('credit_cards').insert({
      workspace_id: workspaceId,
      bank_id: form.bank_id,
      personal_member_id: form.personal_member_id || null,
      holder: form.holder,
      nickname: form.nickname || null,
      last_four: form.last_four || null,
      credit_limit: parseFloat(form.credit_limit),
      cut_day: parseInt(form.cut_day),
      payment_due_day: parseInt(form.payment_due_day),
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
      rewards_type: form.rewards_type || null,
      accent_color: form.accent_color,
      notes: form.notes || null,
    })
    setLoading(false)
    if (!error) { setShowForm(false); router.refresh() }
    else console.error(error)
  }

  async function addBank(name: string) {
    const { data } = await supabase.from('banks').insert({ workspace_id: workspaceId, name }).select().single()
    if (data) { setForm(f => ({ ...f, bank_id: data.id })); router.refresh() }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Mis Tarjetas</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{cards.length} tarjeta{cards.length !== 1 ? 's' : ''} registrada{cards.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'rgba(157,123,255,0.15)', border: '1px solid rgba(157,123,255,0.3)',
            color: '#9D7BFF', borderRadius: 10, padding: '8px 14px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass fade-up" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Nueva tarjeta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="input-glass"
                value={form.bank_id}
                onChange={e => setForm(f => ({ ...f, bank_id: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}
              >
                <option value="">Banco…</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 12px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12 }}
                onClick={() => { const n = prompt('Nombre del banco:'); if (n) addBank(n) }}
              >+ Banco</button>
            </div>
            <select className="input-glass" value={form.personal_member_id} onChange={e => setForm(f => ({ ...f, personal_member_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
              <option value="">Titular…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" placeholder="Nombre / apodo" value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
              <input className="input-glass" placeholder="••••" maxLength={4} value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))} style={{ maxWidth: 80 }} />
            </div>
            <input className="input-glass" type="number" placeholder="Límite de crédito" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de corte</label>
                <input className="input-glass" type="number" min={1} max={31} value={form.cut_day} onChange={e => setForm(f => ({ ...f, cut_day: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de pago</label>
                <input className="input-glass" type="number" min={1} max={31} value={form.payment_due_day} onChange={e => setForm(f => ({ ...f, payment_due_day: e.target.value }))} />
              </div>
            </div>
            <input className="input-glass" placeholder="Tipo de recompensas (opcional)" value={form.rewards_type} onChange={e => setForm(f => ({ ...f, rewards_type: e.target.value }))} />
            {/* Accent color */}
            <div>
              <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Color acento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ACCENT_COLORS.map(c => (
                  <div
                    key={c} onClick={() => setForm(f => ({ ...f, accent_color: c }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.accent_color === c ? `3px solid white` : '3px solid transparent',
                      boxShadow: form.accent_color === c ? `0 0 8px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !form.bank_id || !form.credit_limit}
              style={{
                background: 'linear-gradient(135deg, rgba(157,123,255,0.3), rgba(48,209,88,0.2))',
                border: '1px solid rgba(157,123,255,0.4)',
                borderRadius: 10, padding: '11px', color: 'white',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: loading || !form.bank_id || !form.credit_limit ? 0.5 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Guardar tarjeta'}
            </button>
          </div>
        </div>
      )}

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>💳</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Agrega tu primera tarjeta</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((card, i) => {
            const accent = card.accent_color ?? '#FFD60A'
            return (
              <div key={card.id} className={`glass float-${(i % 5) + 1}`} style={{
                padding: 16, borderColor: `${accent}22`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.7 }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{card.bank?.name}</span>
                      {card.personal_member && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.personal_member.name}</span>}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>{card.nickname ?? `••••${card.last_four ?? '----'}`}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Límite: {fmtMXN(card.credit_limit)} · Corte día {card.cut_day} · Pago día {card.payment_due_day}
                    </p>
                  </div>
                  <ProgressRing percent={100} size={56} stroke={5} color={accent} label="" sublabel="" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
