'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CreditCard, Bank, PersonalMember, CardStatement, StatementStatus, Installment } from '@/types/database'
import ProgressRing from '@/components/ui/ProgressRing'

interface Props {
  cards: CreditCard[]
  banks: Bank[]
  members: PersonalMember[]
  statements: CardStatement[]
  installments: Installment[]
  workspaceId: string
  currentPeriod: string
}

const ACCENT_COLORS = ['#FFD60A', '#FF6B9D', '#9D7BFF', '#30D158', '#0A84FF', '#FF9F0A']

function calcDueDate(period: string, cut_day: number, payment_due_day: number): string {
  const [year, month] = period.split('-').map(Number)
  if (payment_due_day > cut_day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(payment_due_day).padStart(2, '0')}`
  }
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  return `${ny}-${String(nm).padStart(2, '0')}-${String(payment_due_day).padStart(2, '0')}`
}

export default function CardsClient({ cards, banks, members, statements, installments, workspaceId, currentPeriod }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Track which card has the edit panel or statement panel open
  const [editCardId, setEditCardId] = useState<string | null>(null)
  const [statementCardId, setStatementCardId] = useState<string | null>(null)
  const [diferidoCardId, setDiferidoCardId] = useState<string | null>(null)

  // Add card form
  const [addForm, setAddForm] = useState({
    bank_id: '', holder: 'Kevin', nickname: '', last_four: '',
    credit_limit: '', cut_day: '1', payment_due_day: '20',
    interest_rate: '', rewards_type: '', accent_color: '#FFD60A',
    personal_member_id: '',
  })

  // Edit card state
  const [editForm, setEditForm] = useState({
    nickname: '', credit_limit: '', cut_day: '', payment_due_day: '', accent_color: '',
  })

  // Statement state
  const [stmtForm, setStmtForm] = useState<{
    closing_balance: string
    minimum_payment: string
    due_date: string
    status: StatementStatus
  }>({
    closing_balance: '', minimum_payment: '', due_date: '', status: 'pending',
  })

  // Diferido form state
  const [diferidoForm, setDiferidoForm] = useState({
    description: '',
    total_amount: '',
    total_installments: '',
    monthly_amount: '',
    start_date: new Date().toISOString().slice(0, 7),
    has_interest: false,
  })

  const fmtMXN = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  const stmtByCard = Object.fromEntries(statements.map(s => [s.card_id, s]))

  // ── ADD CARD ──────────────────────────────────────────────────────
  async function handleAddCard() {
    if (!addForm.bank_id || !addForm.credit_limit) return
    setLoading(true)
    const { error } = await supabase.from('credit_cards').insert({
      workspace_id: workspaceId,
      bank_id: addForm.bank_id,
      personal_member_id: addForm.personal_member_id || null,
      holder: addForm.holder,
      nickname: addForm.nickname || null,
      last_four: addForm.last_four || null,
      credit_limit: parseFloat(addForm.credit_limit),
      cut_day: parseInt(addForm.cut_day),
      payment_due_day: parseInt(addForm.payment_due_day),
      interest_rate: addForm.interest_rate ? parseFloat(addForm.interest_rate) : null,
      rewards_type: addForm.rewards_type || null,
      accent_color: addForm.accent_color,
    })
    setLoading(false)
    if (!error) { setShowAddForm(false); router.refresh() }
  }

  async function addBank(name: string) {
    const { data } = await supabase.from('banks').insert({ workspace_id: workspaceId, name }).select().single()
    if (data) { setAddForm(f => ({ ...f, bank_id: data.id })); router.refresh() }
  }

  // ── EDIT CARD ─────────────────────────────────────────────────────
  function openEdit(card: CreditCard) {
    setStatementCardId(null)
    setEditCardId(card.id)
    setEditForm({
      nickname: card.nickname ?? '',
      credit_limit: String(card.credit_limit),
      cut_day: String(card.cut_day),
      payment_due_day: String(card.payment_due_day),
      accent_color: card.accent_color ?? '#FFD60A',
    })
  }

  async function handleEditSave(cardId: string) {
    setLoading(true)
    const { error } = await supabase.from('credit_cards').update({
      nickname: editForm.nickname || null,
      credit_limit: parseFloat(editForm.credit_limit),
      cut_day: parseInt(editForm.cut_day),
      payment_due_day: parseInt(editForm.payment_due_day),
      accent_color: editForm.accent_color,
    }).eq('id', cardId)
    setLoading(false)
    if (!error) { setEditCardId(null); router.refresh() }
  }

  // ── STATEMENT ─────────────────────────────────────────────────────
  function openStatement(card: CreditCard) {
    setEditCardId(null)
    setStatementCardId(card.id)
    const existing = stmtByCard[card.id]
    setStmtForm({
      closing_balance: existing ? String(existing.closing_balance) : '',
      minimum_payment: existing?.minimum_payment ? String(existing.minimum_payment) : '',
      due_date: existing?.due_date ?? calcDueDate(currentPeriod, card.cut_day, card.payment_due_day),
      status: (existing?.status as StatementStatus) ?? 'pending',
    })
  }

  async function handleStmtSave(card: CreditCard) {
    if (!stmtForm.closing_balance) return
    setLoading(true)
    const existing = stmtByCard[card.id]
    const payload = {
      workspace_id: workspaceId,
      card_id: card.id,
      period: currentPeriod,
      closing_balance: parseFloat(stmtForm.closing_balance),
      minimum_payment: stmtForm.minimum_payment ? parseFloat(stmtForm.minimum_payment) : null,
      due_date: stmtForm.due_date,
      status: stmtForm.status,
    }
    const { error } = existing
      ? await supabase.from('card_statements').update(payload).eq('id', existing.id)
      : await supabase.from('card_statements').insert(payload)
    setLoading(false)
    if (!error) { setStatementCardId(null); router.refresh() }
  }

  // ── DIFERIDOS ─────────────────────────────────────────────────────
  function openDiferido(card: CreditCard) {
    setEditCardId(null)
    setStatementCardId(null)
    setDiferidoCardId(card.id)
    const stmt = stmtByCard[card.id]
    setDiferidoForm({
      description: '',
      total_amount: stmt ? String(stmt.closing_balance) : '',
      total_installments: '',
      monthly_amount: '',
      start_date: new Date().toISOString().slice(0, 7),
      has_interest: false,
    })
  }

  function calcMonthly(total: string, count: string) {
    const t = parseFloat(total)
    const c = parseInt(count)
    if (!isNaN(t) && !isNaN(c) && c > 0) {
      setDiferidoForm(f => ({ ...f, monthly_amount: (t / c).toFixed(2) }))
    }
  }

  async function handleDiferidoSave(card: CreditCard) {
    if (!diferidoForm.total_amount || !diferidoForm.total_installments) return
    setLoading(true)
    const total = parseFloat(diferidoForm.total_amount)
    const count = parseInt(diferidoForm.total_installments)
    const monthly = diferidoForm.monthly_amount ? parseFloat(diferidoForm.monthly_amount) : total / count
    const { error } = await supabase.from('installments').insert({
      workspace_id: workspaceId,
      card_id: card.id,
      description: diferidoForm.description || 'Diferido',
      total_amount: total,
      monthly_amount: parseFloat(monthly.toFixed(2)),
      total_installments: count,
      remaining_installments: count,
      remaining_balance: total,
      start_date: diferidoForm.start_date + '-01',
      status: 'active',
      notes: diferidoForm.has_interest ? 'Con interés' : null,
    })
    setLoading(false)
    if (!error) { setDiferidoCardId(null); router.refresh() }
  }

  async function handleCancelInstallment(id: string) {
    await supabase.from('installments').update({ status: 'cancelled' }).eq('id', id)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Mis Tarjetas</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} · {currentPeriod}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: 'rgba(157,123,255,0.15)', border: '1px solid rgba(157,123,255,0.3)',
            color: '#9D7BFF', borderRadius: 10, padding: '8px 14px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showAddForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="glass fade-up" style={{ padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Nueva tarjeta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="input-glass"
                value={addForm.bank_id}
                onChange={e => setAddForm(f => ({ ...f, bank_id: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}
              >
                <option value="">Banco…</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 12px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12 }}
                onClick={() => { const n = prompt('Nombre del banco:'); if (n) addBank(n) }}
              >+ Banco</button>
            </div>
            <select className="input-glass" value={addForm.personal_member_id} onChange={e => setAddForm(f => ({ ...f, personal_member_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
              <option value="">Titular (opcional)…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" placeholder="Nombre / apodo" value={addForm.nickname} onChange={e => setAddForm(f => ({ ...f, nickname: e.target.value }))} />
              <input className="input-glass" placeholder="••••" maxLength={4} value={addForm.last_four} onChange={e => setAddForm(f => ({ ...f, last_four: e.target.value }))} style={{ maxWidth: 80 }} />
            </div>
            <input className="input-glass" type="number" placeholder="Límite de crédito" value={addForm.credit_limit} onChange={e => setAddForm(f => ({ ...f, credit_limit: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de corte</label>
                <input className="input-glass" type="number" min={1} max={31} value={addForm.cut_day} onChange={e => setAddForm(f => ({ ...f, cut_day: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de pago</label>
                <input className="input-glass" type="number" min={1} max={31} value={addForm.payment_due_day} onChange={e => setAddForm(f => ({ ...f, payment_due_day: e.target.value }))} />
              </div>
            </div>
            <input className="input-glass" placeholder="Tipo de recompensas (opcional)" value={addForm.rewards_type} onChange={e => setAddForm(f => ({ ...f, rewards_type: e.target.value }))} />
            <div>
              <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Color acento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ACCENT_COLORS.map(c => (
                  <div key={c} onClick={() => setAddForm(f => ({ ...f, accent_color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: addForm.accent_color === c ? '3px solid white' : '3px solid transparent', boxShadow: addForm.accent_color === c ? `0 0 8px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
            <button
              onClick={handleAddCard}
              disabled={loading || !addForm.bank_id || !addForm.credit_limit}
              style={{ background: 'linear-gradient(135deg, rgba(157,123,255,0.3), rgba(48,209,88,0.2))', border: '1px solid rgba(157,123,255,0.4)', borderRadius: 10, padding: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading || !addForm.bank_id || !addForm.credit_limit ? 0.5 : 1 }}
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
          {cards.map((card) => {
            const accent = card.accent_color ?? '#FFD60A'
            const stmt = stmtByCard[card.id]
            const usedPct = (stmt && stmt.status !== 'paid') ? Math.min(100, (stmt.closing_balance / card.credit_limit) * 100) : 0
            const isEditing = editCardId === card.id
            const isStatement = statementCardId === card.id
            const isDiferido = diferidoCardId === card.id
            const cardInstallments = installments.filter(i => i.card_id === card.id)
            const diferidoMonthly = cardInstallments.reduce((s, i) => s + i.monthly_amount, 0)

            return (
              <div key={card.id} className="glass" style={{ padding: '16px', borderColor: `${accent}22`, position: 'relative', overflow: 'hidden' }}>
                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{card.bank?.name}</span>
                      {card.last_four && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>••••{card.last_four}</span>}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>{card.nickname ?? `Tarjeta ${card.bank?.name ?? ''}`}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Límite: <span style={{ color: 'var(--text-secondary)' }}>{fmtMXN(card.credit_limit)}</span></span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Corte: <span style={{ color: 'var(--text-secondary)' }}>día {card.cut_day}</span></span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pago: <span style={{ color: 'var(--text-secondary)' }}>día {card.payment_due_day}</span></span>
                    </div>
                  </div>
                  <ProgressRing percent={usedPct} size={52} stroke={5} color={accent} label="" sublabel="" />
                </div>

                {/* Statement info */}
                {stmt ? (
                  <div style={{ background: `${accent}10`, borderRadius: 10, padding: '10px 12px', marginBottom: 12, border: `1px solid ${accent}20` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="label-xs">Saldo {currentPeriod}</span>
                        <p style={{ fontSize: 18, fontWeight: 800, color: accent, marginTop: 2 }}>{fmtMXN(stmt.closing_balance)}</p>
                        {stmt.minimum_payment && (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Pago mínimo: {fmtMXN(stmt.minimum_payment)}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="label-xs">Vence</span>
                        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                          {new Date(stmt.due_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block',
                          background: stmt.status === 'paid' ? 'rgba(48,209,88,0.15)' : stmt.status === 'overdue' ? 'rgba(255,69,58,0.15)' : 'rgba(255,159,10,0.15)',
                          color: stmt.status === 'paid' ? '#30D158' : stmt.status === 'overdue' ? '#FF453A' : '#FF9F0A',
                        }}>
                          {stmt.status === 'paid' ? 'Pagado' : stmt.status === 'overdue' ? 'Vencido' : stmt.status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin saldo registrado para {currentPeriod}</p>
                  </div>
                )}

                {/* Diferidos summary */}
                {cardInstallments.length > 0 && (
                  <div style={{ background: 'rgba(157,123,255,0.07)', border: '1px solid rgba(157,123,255,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>Diferidos activos</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF' }}>
                        {cardInstallments.length} compra{cardInstallments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>Cuota mensual</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#9D7BFF' }}>{fmtMXN(diferidoMonthly)}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing && !isStatement && !isDiferido && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => openStatement(card)}
                      style={{ flex: 1, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '8px', color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {stmt ? '✏️ Saldo' : '+ Saldo'}
                    </button>
                    <button
                      onClick={() => openDiferido(card)}
                      style={{ background: 'rgba(157,123,255,0.12)', border: '1px solid rgba(157,123,255,0.25)', borderRadius: 8, padding: '8px 10px', color: '#9D7BFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Diferir
                    </button>
                    <button
                      onClick={() => openEdit(card)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                    >
                      ⚙️
                    </button>
                  </div>
                )}

                {/* EDIT PANEL */}
                {isEditing && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Editar tarjeta</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        className="input-glass"
                        placeholder="Nombre / apodo"
                        value={editForm.nickname}
                        onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))}
                      />
                      <input
                        className="input-glass"
                        type="number"
                        placeholder="Límite de crédito"
                        value={editForm.credit_limit}
                        onChange={e => setEditForm(f => ({ ...f, credit_limit: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de corte</label>
                          <input className="input-glass" type="number" min={1} max={31} value={editForm.cut_day} onChange={e => setEditForm(f => ({ ...f, cut_day: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de pago</label>
                          <input className="input-glass" type="number" min={1} max={31} value={editForm.payment_due_day} onChange={e => setEditForm(f => ({ ...f, payment_due_day: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Color acento</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {ACCENT_COLORS.map(c => (
                            <div key={c} onClick={() => setEditForm(f => ({ ...f, accent_color: c }))}
                              style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: editForm.accent_color === c ? '3px solid white' : '3px solid transparent', boxShadow: editForm.accent_color === c ? `0 0 8px ${c}` : 'none' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleEditSave(card.id)}
                          disabled={loading}
                          style={{ flex: 1, background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 8, padding: 10, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                        >
                          {loading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button
                          onClick={() => setEditCardId(null)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* DIFERIDO PANEL */}
                {isDiferido && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF', marginBottom: 12 }}>
                      Registrar diferido
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Descripción</label>
                        <input
                          className="input-glass"
                          placeholder="Ej: iPhone, televisor…"
                          value={diferidoForm.description}
                          onChange={e => setDiferidoForm(f => ({ ...f, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Monto total *</label>
                        <input
                          className="input-glass"
                          type="number"
                          placeholder="Ej: 800"
                          value={diferidoForm.total_amount}
                          onChange={e => {
                            setDiferidoForm(f => ({ ...f, total_amount: e.target.value }))
                            calcMonthly(e.target.value, diferidoForm.total_installments)
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Nº de cuotas *</label>
                          <input
                            className="input-glass"
                            type="number"
                            placeholder="Ej: 12"
                            min={1}
                            value={diferidoForm.total_installments}
                            onChange={e => {
                              setDiferidoForm(f => ({ ...f, total_installments: e.target.value }))
                              calcMonthly(diferidoForm.total_amount, e.target.value)
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Cuota mensual</label>
                          <input
                            className="input-glass"
                            type="number"
                            placeholder="Auto-calculado"
                            value={diferidoForm.monthly_amount}
                            onChange={e => setDiferidoForm(f => ({ ...f, monthly_amount: e.target.value }))}
                            style={{ color: diferidoForm.monthly_amount ? '#9D7BFF' : undefined }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Mes de inicio</label>
                        <input
                          className="input-glass"
                          type="month"
                          value={diferidoForm.start_date}
                          onChange={e => setDiferidoForm(f => ({ ...f, start_date: e.target.value }))}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={diferidoForm.has_interest}
                          onChange={e => setDiferidoForm(f => ({ ...f, has_interest: e.target.checked }))}
                          style={{ accentColor: '#9D7BFF', width: 14, height: 14 }}
                        />
                        Tiene interés (diferido con costo)
                      </label>
                      {diferidoForm.monthly_amount && diferidoForm.total_installments && (
                        <div style={{ background: 'rgba(157,123,255,0.08)', border: '1px solid rgba(157,123,255,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Resumen: </span>
                          <strong style={{ color: '#9D7BFF' }}>{fmtMXN(parseFloat(diferidoForm.monthly_amount || '0'))}/mes</strong>
                          <span style={{ color: 'var(--text-muted)' }}> × {diferidoForm.total_installments} cuotas = </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{fmtMXN(parseFloat(diferidoForm.monthly_amount || '0') * parseInt(diferidoForm.total_installments || '0'))}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleDiferidoSave(card)}
                          disabled={loading || !diferidoForm.total_amount || !diferidoForm.total_installments}
                          style={{ flex: 1, background: 'rgba(157,123,255,0.2)', border: '1px solid rgba(157,123,255,0.4)', borderRadius: 8, padding: 10, color: '#9D7BFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading || !diferidoForm.total_amount || !diferidoForm.total_installments ? 0.5 : 1 }}
                        >
                          {loading ? 'Guardando...' : 'Registrar diferido'}
                        </button>
                        <button
                          onClick={() => setDiferidoCardId(null)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATEMENT PANEL */}
                {isStatement && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {stmt ? 'Editar saldo' : 'Registrar saldo'} · {currentPeriod}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Saldo del estado de cuenta *</label>
                        <input
                          className="input-glass"
                          type="number"
                          placeholder="Ej: 12500"
                          value={stmtForm.closing_balance}
                          onChange={e => setStmtForm(f => ({ ...f, closing_balance: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Pago mínimo (opcional)</label>
                        <input
                          className="input-glass"
                          type="number"
                          placeholder="Ej: 1250"
                          value={stmtForm.minimum_payment}
                          onChange={e => setStmtForm(f => ({ ...f, minimum_payment: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Fecha de pago</label>
                        <input
                          className="input-glass"
                          type="date"
                          value={stmtForm.due_date}
                          onChange={e => setStmtForm(f => ({ ...f, due_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Estado</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['pending', 'partial', 'paid', 'overdue'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => setStmtForm(f => ({ ...f, status: s }))}
                              style={{
                                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                border: stmtForm.status === s ? `1px solid ${s === 'paid' ? '#30D158' : s === 'overdue' ? '#FF453A' : s === 'partial' ? '#FF9F0A' : '#9D7BFF'}` : '1px solid rgba(255,255,255,0.1)',
                                background: stmtForm.status === s ? (s === 'paid' ? 'rgba(48,209,88,0.15)' : s === 'overdue' ? 'rgba(255,69,58,0.15)' : s === 'partial' ? 'rgba(255,159,10,0.15)' : 'rgba(157,123,255,0.15)') : 'rgba(255,255,255,0.04)',
                                color: stmtForm.status === s ? (s === 'paid' ? '#30D158' : s === 'overdue' ? '#FF453A' : s === 'partial' ? '#FF9F0A' : '#9D7BFF') : 'var(--text-muted)',
                              }}
                            >
                              {s === 'pending' ? 'Pendiente' : s === 'partial' ? 'Parcial' : s === 'paid' ? 'Pagado' : 'Vencido'}
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                          {{
                            pending: '🕐 El corte llegó pero aún no has pagado',
                            partial: '💸 Pagaste algo pero queda saldo pendiente',
                            paid:    '✅ Saldo saldado completamente',
                            overdue: '🚨 Pasó la fecha límite sin pagar',
                          }[stmtForm.status]}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleStmtSave(card)}
                          disabled={loading || !stmtForm.closing_balance}
                          style={{ flex: 1, background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 8, padding: 10, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading || !stmtForm.closing_balance ? 0.5 : 1 }}
                        >
                          {loading ? 'Guardando...' : 'Guardar saldo'}
                        </button>
                        <button
                          onClick={() => setStatementCardId(null)}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Diferidos activos ──────────────────────────────────────── */}
      {installments.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>Diferidos activos</h2>
            <span style={{ fontSize: 11, color: '#9D7BFF', fontWeight: 700 }}>
              {installments.length} compra{installments.length !== 1 ? 's' : ''} ·{' '}
              {fmtMXN(installments.reduce((s, i) => s + i.monthly_amount, 0))}/mes
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {installments.map(inst => {
              const card = cards.find(c => c.id === inst.card_id)
              const accent = card?.accent_color ?? '#9D7BFF'
              const paid = inst.total_installments - inst.remaining_installments
              const pct = Math.round((paid / inst.total_installments) * 100)
              const hasInterest = inst.notes?.includes('interés')
              return (
                <div key={inst.id} className="glass" style={{ padding: '14px 16px', borderColor: 'rgba(157,123,255,0.15)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, #9D7BFF, #9D7BFF44)` }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>
                          {card?.nickname ?? card?.bank?.name ?? 'Tarjeta'}
                          {card?.last_four && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ••{card.last_four}</span>}
                        </span>
                        {hasInterest && (
                          <span style={{ fontSize: 9, background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', color: '#FF9F0A', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                            CON INTERÉS
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{inst.description}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Inicio: {new Date(inst.start_date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#9D7BFF' }}>{fmtMXN(inst.monthly_amount)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span></p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Resta: <strong style={{ color: 'var(--text-secondary)' }}>{fmtMXN(inst.remaining_balance)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Cuota {paid + 1} de {inst.total_installments}
                      </span>
                      <span style={{ fontSize: 10, color: '#9D7BFF', fontWeight: 700 }}>{pct}% pagado</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'linear-gradient(90deg, #9D7BFF88, #9D7BFF)',
                        borderRadius: 3, boxShadow: '0 0 8px #9D7BFF60',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                      {Array.from({ length: inst.total_installments }).map((_, i) => (
                        <div key={i} style={{
                          width: Math.min(16, Math.floor(280 / inst.total_installments) - 2),
                          height: 6, borderRadius: 2, flexShrink: 0,
                          background: i < paid ? '#9D7BFF' : i === paid ? '#9D7BFF44' : 'rgba(255,255,255,0.08)',
                        }} />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelInstallment(inst.id)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Cancelar diferido
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
