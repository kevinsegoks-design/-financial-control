'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CreditCard, Bank, PersonalMember, CardStatement, StatementStatus, Installment, PersonalPayment } from '@/types/database'
import ProgressRing from '@/components/ui/ProgressRing'
import { fmtUSD } from '@/lib/format'

interface Props {
  cards: CreditCard[]
  banks: Bank[]
  members: PersonalMember[]
  statements: CardStatement[]
  installments: Installment[]
  payments: PersonalPayment[]
  workspaceId: string
  currentPeriod: string
}

const ACCENT_COLORS = [
  '#FFD60A', '#FF6B9D', '#9D7BFF', '#30D158', '#0A84FF', '#FF9F0A',
  '#FF453A', '#64D2FF', '#BF5AF2', '#AC8E68', '#32D74B', '#FF375F',
  '#6AC4DC', '#FFB340', '#30B0C7', '#34C759',
]

function calcDueDate(period: string, cut_day: number, payment_due_day: number): string {
  const [year, month] = period.split('-').map(Number)
  if (payment_due_day > cut_day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(payment_due_day).padStart(2, '0')}`
  }
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  return `${ny}-${String(nm).padStart(2, '0')}-${String(payment_due_day).padStart(2, '0')}`
}

function calcAmortized(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0 || months === 0) return months > 0 ? principal / months : 0
  const r = annualRate / 100 / 12
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)
}

export default function CardsClient({ cards, banks, members, statements, installments, payments, workspaceId, currentPeriod }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [editCardId, setEditCardId]           = useState<string | null>(null)
  const [statementCardId, setStatementCardId] = useState<string | null>(null)
  const [diferidoCardId, setDiferidoCardId]   = useState<string | null>(null)
  const [historyCardId, setHistoryCardId]     = useState<string | null>(null)
  const [gastoCardId, setGastoCardId]         = useState<string | null>(null)
  const [showBankManager, setShowBankManager] = useState(false)
  const [editBankId, setEditBankId]           = useState<string | null>(null)
  const [editBankName, setEditBankName]       = useState('')
  const [gastoForm, setGastoForm]             = useState({ amount: '', description: '' })

  const [addForm, setAddForm] = useState({
    bank_id: '', nickname: '', last_four: '',
    credit_limit: '', cut_day: '1', payment_due_day: '20',
    interest_rate: '', rewards_type: '', accent_color: '#FFD60A',
    personal_member_id: '',
  })

  const [editForm, setEditForm] = useState({
    nickname: '', credit_limit: '', cut_day: '', payment_due_day: '',
    accent_color: '', interest_rate: '',
  })

  const [stmtForm, setStmtForm] = useState<{
    closing_balance: string
    minimum_payment: string
    due_date: string
    status: StatementStatus
  }>({ closing_balance: '', minimum_payment: '', due_date: '', status: 'pending' })

  const [diferidoForm, setDiferidoForm] = useState({
    description: '', total_amount: '', total_installments: '',
    monthly_amount: '', start_date: new Date().toISOString().slice(0, 7),
    interest_rate_annual: '', has_interest: false,
  })

  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })

  const stmtByCard = useMemo(
    () => Object.fromEntries(statements.map(s => [s.card_id, s])),
    [statements]
  )

  const paymentsByStmt = useMemo(
    () => payments.reduce((acc, p) => {
      if (p.card_statement_id) {
        if (!acc[p.card_statement_id]) acc[p.card_statement_id] = []
        acc[p.card_statement_id].push(p)
      }
      return acc
    }, {} as Record<string, PersonalPayment[]>),
    [payments]
  )

  // ── ADD CARD ──────────────────────────────────────────────────────
  async function handleAddCard() {
    if (!addForm.bank_id || !addForm.credit_limit) return
    setLoading(true)
    const { error } = await supabase.from('credit_cards').insert({
      workspace_id: workspaceId,
      bank_id: addForm.bank_id,
      personal_member_id: addForm.personal_member_id || null,
      holder: 'Titular',
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

  async function handleBankEditSave(bankId: string) {
    if (!editBankName.trim()) return
    await supabase.from('banks').update({ name: editBankName.trim() }).eq('id', bankId)
    setEditBankId(null)
    router.refresh()
  }

  async function handleBankDelete(bankId: string) {
    const inUse = cards.some(c => c.bank_id === bankId)
    if (inUse) { alert('No puedes borrar un banco que tiene tarjetas asignadas.'); return }
    await supabase.from('banks').delete().eq('id', bankId)
    router.refresh()
  }

  async function addMember(name: string, color: string) {
    await supabase.from('personal_members').insert({ workspace_id: workspaceId, name, color })
    router.refresh()
  }

  async function handleDeleteMember(memberId: string) {
    await supabase.from('personal_members').delete().eq('id', memberId)
    router.refresh()
  }

  // ── NUEVO GASTO CORRIENTE ─────────────────────────────────────────
  async function handleNewGasto(card: CreditCard) {
    const amount = parseFloat(gastoForm.amount)
    if (!amount || amount <= 0) return
    setLoading(true)
    const existing = stmtByCard[card.id]
    if (existing) {
      await supabase.from('card_statements').update({
        closing_balance: existing.closing_balance + amount,
        status: existing.status === 'paid' ? 'partial' : existing.status,
      }).eq('id', existing.id)
    } else {
      await supabase.from('card_statements').insert({
        workspace_id: workspaceId,
        card_id: card.id,
        period: currentPeriod,
        closing_balance: amount,
        due_date: calcDueDate(currentPeriod, card.cut_day, card.payment_due_day),
        status: 'pending',
      })
    }
    setLoading(false)
    setGastoCardId(null)
    setGastoForm({ amount: '', description: '' })
    router.refresh()
  }

  // ── EDIT CARD ─────────────────────────────────────────────────────
  function openEdit(card: CreditCard) {
    setStatementCardId(null); setDiferidoCardId(null); setHistoryCardId(null)
    setEditCardId(card.id)
    setEditForm({
      nickname: card.nickname ?? '',
      credit_limit: String(card.credit_limit),
      cut_day: String(card.cut_day),
      payment_due_day: String(card.payment_due_day),
      accent_color: card.accent_color ?? '#FFD60A',
      interest_rate: card.interest_rate ? String(card.interest_rate) : '',
    })
  }

  async function handleEditSave(cardId: string) {
    setLoading(true)
    await supabase.from('credit_cards').update({
      nickname: editForm.nickname || null,
      credit_limit: parseFloat(editForm.credit_limit),
      cut_day: parseInt(editForm.cut_day),
      payment_due_day: parseInt(editForm.payment_due_day),
      accent_color: editForm.accent_color,
      interest_rate: editForm.interest_rate ? parseFloat(editForm.interest_rate) : null,
    }).eq('id', cardId)
    setLoading(false)
    setEditCardId(null)
    router.refresh()
  }

  // ── STATEMENT ─────────────────────────────────────────────────────
  function openStatement(card: CreditCard) {
    setEditCardId(null); setDiferidoCardId(null); setHistoryCardId(null)
    setStatementCardId(card.id)
    const existing = stmtByCard[card.id]
    const stmtPays = existing ? (paymentsByStmt[existing.id] ?? []) : []
    const totalPaid = stmtPays.reduce((s, p) => s + p.amount, 0)
    setStmtForm({
      closing_balance: existing ? String(existing.closing_balance + totalPaid) : '',
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
    if (existing) {
      await supabase.from('personal_payments').delete().eq('card_statement_id', existing.id)
      await supabase.from('card_statements').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('card_statements').insert(payload)
    }
    setLoading(false)
    setStatementCardId(null)
    router.refresh()
  }

  // ── DIFERIDOS ─────────────────────────────────────────────────────
  function openDiferido(card: CreditCard) {
    setEditCardId(null); setStatementCardId(null); setHistoryCardId(null)
    setDiferidoCardId(card.id)
    setDiferidoForm({
      description: '', total_amount: '', total_installments: '',
      monthly_amount: '', start_date: new Date().toISOString().slice(0, 7),
      interest_rate_annual: '', has_interest: false,
    })
  }

  function recalcDiferido(total: string, count: string, rate: string) {
    const t = parseFloat(total), c = parseInt(count), r = parseFloat(rate)
    if (isNaN(t) || isNaN(c) || c <= 0) return
    const monthly = (!isNaN(r) && r > 0)
      ? calcAmortized(t, r, c)
      : t / c
    setDiferidoForm(f => ({ ...f, monthly_amount: monthly.toFixed(2) }))
  }

  async function handleDiferidoSave(card: CreditCard) {
    if (!diferidoForm.total_amount || !diferidoForm.total_installments) return
    setLoading(true)
    const total = parseFloat(diferidoForm.total_amount)
    const count = parseInt(diferidoForm.total_installments)
    const rate = parseFloat(diferidoForm.interest_rate_annual)
    const monthly = diferidoForm.monthly_amount
      ? parseFloat(diferidoForm.monthly_amount)
      : (!isNaN(rate) && rate > 0 ? calcAmortized(total, rate, count) : total / count)
    const totalInterest = diferidoForm.has_interest ? (monthly * count - total) : 0
    const notes = diferidoForm.has_interest
      ? `Con interés${!isNaN(rate) && rate > 0 ? ` ${rate}% anual` : ''} · Total a pagar: $${(monthly * count).toFixed(2)} · Intereses: $${totalInterest.toFixed(2)}`
      : null
    await supabase.from('installments').insert({
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
      notes,
    })
    setLoading(false)
    setDiferidoCardId(null)
    router.refresh()
  }

  async function handleCancelInstallment(id: string) {
    await supabase.from('installments').update({ status: 'cancelled' }).eq('id', id)
    router.refresh()
  }

  // ── DELETE PAYMENT ────────────────────────────────────────────────
  async function handleDeletePayment(paymentId: string, stmtId: string, paymentAmount: number) {
    setLoading(true)
    const stmt = statements.find(s => s.id === stmtId)
    if (stmt) {
      const stmtPays = paymentsByStmt[stmtId] ?? []
      const remainingCount = stmtPays.filter(p => p.id !== paymentId).length
      await supabase.from('card_statements').update({
        closing_balance: stmt.closing_balance + paymentAmount,
        status: remainingCount === 0 ? 'pending' : 'partial',
      }).eq('id', stmtId)
    }
    await supabase.from('personal_payments').delete().eq('id', paymentId)
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Mis Tarjetas</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} · {currentPeriod}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowBankManager(v => !v)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>🏦</button>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ background: 'rgba(157,123,255,0.15)', border: '1px solid rgba(157,123,255,0.3)', color: '#9D7BFF', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showAddForm ? 'Cancelar' : '+ Nueva'}
          </button>
        </div>
      </div>

      {/* ── BANK MANAGER ── */}
      {showBankManager && (
        <div className="glass fade-up" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>🏦 Gestionar bancos y miembros</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {banks.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {editBankId === b.id ? (
                  <>
                    <input className="input-glass" value={editBankName} onChange={e => setEditBankName(e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => handleBankEditSave(b.id)} style={{ background: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 8, padding: '6px 10px', color: '#30D158', fontSize: 12, cursor: 'pointer' }}>✓</button>
                    <button onClick={() => setEditBankId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 13 }}>{b.name}</span>
                    <button onClick={() => { setEditBankId(b.id); setEditBankName(b.name) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 9px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => handleBankDelete(b.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8, padding: '5px 9px', color: '#FF453A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
                  </>
                )}
              </div>
            ))}
            <button onClick={() => { const n = prompt('Nombre del banco:'); if (n) addBank(n) }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>+ Agregar banco</button>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>MIEMBROS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>{m.name}</span>
                <button onClick={() => handleDeleteMember(m.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8, padding: '5px 9px', color: '#FF453A', fontSize: 11, cursor: 'pointer' }}>🗑</button>
              </div>
            ))}
            <button onClick={() => {
              const n = prompt('Nombre del miembro:')
              if (!n) return
              const colors = ['#FF6B9D','#9D7BFF','#30D158','#0A84FF','#FFD60A','#FF9F0A']
              addMember(n, colors[members.length % colors.length])
            }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>+ Agregar miembro</button>
          </div>
        </div>
      )}

      {/* ── ADD FORM ── */}
      {showAddForm && (
        <div className="glass fade-up" style={{ padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Nueva tarjeta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="input-glass" value={addForm.bank_id} onChange={e => setAddForm(f => ({ ...f, bank_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', flex: 1 }}>
                <option value="">Banco…</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 12px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12 }} onClick={() => { const n = prompt('Nombre del banco:'); if (n) addBank(n) }}>
                + Banco
              </button>
            </div>
            <select className="input-glass" value={addForm.personal_member_id} onChange={e => setAddForm(f => ({ ...f, personal_member_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
              <option value="">Titular (opcional)…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" placeholder="Nombre / apodo" value={addForm.nickname} onChange={e => setAddForm(f => ({ ...f, nickname: e.target.value }))} />
              <input className="input-glass" placeholder="Últimos 4 dígitos" maxLength={4} value={addForm.last_four} onChange={e => setAddForm(f => ({ ...f, last_four: e.target.value }))} style={{ maxWidth: 130 }} />
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
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Interés % anual</label>
                <input className="input-glass" type="number" placeholder="17" value={addForm.interest_rate} onChange={e => setAddForm(f => ({ ...f, interest_rate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Color acento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ACCENT_COLORS.map(c => (
                  <div key={c} onClick={() => setAddForm(f => ({ ...f, accent_color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: addForm.accent_color === c ? '3px solid white' : '3px solid transparent', boxShadow: addForm.accent_color === c ? `0 0 8px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
            <button onClick={handleAddCard} disabled={loading || !addForm.bank_id || !addForm.credit_limit} style={{ background: 'linear-gradient(135deg, rgba(157,123,255,0.3), rgba(48,209,88,0.2))', border: '1px solid rgba(157,123,255,0.4)', borderRadius: 10, padding: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading || !addForm.bank_id || !addForm.credit_limit ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : 'Guardar tarjeta'}
            </button>
          </div>
        </div>
      )}

      {/* ── CARDS LIST ── */}
      {cards.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>💳</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Agrega tu primera tarjeta</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((card) => {
            const accent       = card.accent_color ?? '#FFD60A'
            const stmt         = stmtByCard[card.id]
            const stmtPays     = stmt ? (paymentsByStmt[stmt.id] ?? []) : []
            const totalPaid    = stmtPays.reduce((s, p) => s + p.amount, 0)
            const remaining    = stmt ? stmt.closing_balance : 0
            const originalBal  = remaining + totalPaid
            const usedPct      = (stmt && stmt.status !== 'paid') ? Math.min(100, (remaining / card.credit_limit) * 100) : 0
            const interestRate = card.interest_rate ?? 17
            const monthlyRate  = interestRate / 100 / 12
            const monthlyInterest   = remaining > 0 ? remaining * monthlyRate : 0
            const interestOnMin     = stmt?.minimum_payment && remaining > stmt.minimum_payment
              ? (remaining - stmt.minimum_payment) * monthlyRate
              : null

            const isEditing    = editCardId === card.id
            const isStatement  = statementCardId === card.id
            const isDiferido   = diferidoCardId === card.id
            const isHistory    = historyCardId === card.id
            const isGasto      = gastoCardId === card.id

            const cardInst     = installments.filter(i => i.card_id === card.id)
            const instMonthly  = cardInst.reduce((s, i) => s + i.monthly_amount, 0)

            return (
              <div key={card.id} className="glass" style={{ padding: '16px', borderColor: `${accent}22`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{card.bank?.name}</span>
                      {card.last_four && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>••••{card.last_four}</span>}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>{interestRate}% anual</span>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>{card.nickname ?? `Tarjeta ${card.bank?.name ?? ''}`}</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Límite: <span style={{ color: 'var(--text-secondary)' }}>{fmtUSD(card.credit_limit)}</span></span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Corte: <span style={{ color: 'var(--text-secondary)' }}>día {card.cut_day}</span></span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pago: <span style={{ color: 'var(--text-secondary)' }}>día {card.payment_due_day}</span></span>
                    </div>
                  </div>
                  <ProgressRing percent={usedPct} size={52} stroke={5} color={accent} label="" sublabel="" />
                </div>

                {/* Statement section */}
                {stmt ? (
                  <div style={{ background: `${accent}10`, borderRadius: 10, padding: '12px', marginBottom: 10, border: `1px solid ${accent}20` }}>
                    {/* Top row: period + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="label-xs">Estado de cuenta {currentPeriod}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vence {fmtDate(stmt.due_date)}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          background: stmt.status === 'paid' ? 'rgba(48,209,88,0.15)' : stmt.status === 'overdue' ? 'rgba(255,69,58,0.15)' : stmt.status === 'partial' ? 'rgba(255,159,10,0.15)' : 'rgba(157,123,255,0.15)',
                          color: stmt.status === 'paid' ? '#30D158' : stmt.status === 'overdue' ? '#FF453A' : stmt.status === 'partial' ? '#FF9F0A' : '#9D7BFF',
                        }}>
                          {stmt.status === 'paid' ? '✓ Pagado' : stmt.status === 'overdue' ? 'Vencido' : stmt.status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    {/* Balance breakdown */}
                    {totalPaid > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>Saldo original</span>
                          <span>{fmtUSD(originalBal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#30D158' }}>
                          <span>Pagado</span>
                          <span>−{fmtUSD(totalPaid)}</span>
                        </div>
                        <div style={{ height: 1, background: `${accent}30`, margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Pendiente</span>
                          <span style={{ fontSize: 22, fontWeight: 900, color: stmt.status === 'paid' ? '#30D158' : accent }}>{fmtUSD(remaining)}</span>
                        </div>
                        {stmt.minimum_payment && (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Pago mínimo: {fmtUSD(stmt.minimum_payment)}</p>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: 22, fontWeight: 900, color: stmt.status === 'paid' ? '#30D158' : accent }}>{fmtUSD(remaining)}</p>
                          {stmt.minimum_payment && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Pago mínimo: {fmtUSD(stmt.minimum_payment)}</p>}
                        </div>
                      </div>
                    )}

                    {/* Interest warning */}
                    {stmt.status !== 'paid' && monthlyInterest > 0.5 && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.18)', borderRadius: 6 }}>
                        <p style={{ fontSize: 11, color: '#FF9F0A' }}>
                          {interestOnMin
                            ? `⚠️ Si pagas solo el mínimo: +${fmtUSD(interestOnMin)} en intereses el próximo mes`
                            : `💡 Sin pago: +${fmtUSD(monthlyInterest)} en intereses este mes (${interestRate}% anual)`}
                        </p>
                      </div>
                    )}

                    {/* Payment history toggle */}
                    {stmtPays.length > 0 && (
                      <button
                        onClick={() => setHistoryCardId(isHistory ? null : card.id)}
                        style={{ marginTop: 8, background: 'none', border: 'none', color: '#9D7BFF', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                      >
                        {isHistory ? '▼ Ocultar historial' : `▶ ${stmtPays.length} pago${stmtPays.length > 1 ? 's' : ''} registrado${stmtPays.length > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Sin estado de cuenta para {currentPeriod}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Usa "Estado" para registrar el saldo del mes</p>
                  </div>
                )}

                {/* ── HISTORIAL DE PAGOS ── */}
                {isHistory && stmtPays.length > 0 && (
                  <div style={{ marginBottom: 10, border: '1px solid rgba(157,123,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(157,123,255,0.08)', borderBottom: '1px solid rgba(157,123,255,0.15)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF' }}>💳 Historial de pagos</span>
                    </div>
                    {stmtPays.map((pay, i) => (
                      <div key={pay.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderBottom: i < stmtPays.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        background: 'rgba(255,255,255,0.02)',
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#30D158' }}>+{fmtUSD(pay.amount)}</p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                            {new Date(pay.payment_date + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: '2-digit' })}
                            {pay.payment_method ? ` · ${pay.payment_method}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePayment(pay.id, stmt!.id, pay.amount)}
                          disabled={loading}
                          style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 6, padding: '4px 10px', color: '#FF453A', fontSize: 11, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Diferidos summary */}
                {cardInst.length > 0 && (
                  <div style={{ background: 'rgba(157,123,255,0.07)', border: '1px solid rgba(157,123,255,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>📦 Diferidos activos</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF' }}>
                        {cardInst.length} compra{cardInst.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 1 }}>Cuota mensual</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#9D7BFF' }}>{fmtUSD(instMonthly)}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing && !isStatement && !isDiferido && !isGasto && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setGastoCardId(card.id); setGastoForm({ amount: '', description: '' }) }} style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)', borderRadius: 8, padding: '8px 10px', color: '#30D158', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      💳 Gasto
                    </button>
                    <button onClick={() => openStatement(card)} style={{ flex: 1, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '8px', color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {stmt ? '✏️ Estado' : '+ Estado'}
                    </button>
                    <button onClick={() => openDiferido(card)} style={{ background: 'rgba(157,123,255,0.12)', border: '1px solid rgba(157,123,255,0.25)', borderRadius: 8, padding: '8px 10px', color: '#9D7BFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      📦 Diferir
                    </button>
                    <button onClick={() => openEdit(card)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                      ⚙️
                    </button>
                  </div>
                )}

                {/* ── GASTO CORRIENTE PANEL ── */}
                {isGasto && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#30D158', marginBottom: 12 }}>💳 Nuevo gasto corriente</p>
                    {stmt && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Saldo actual: <strong style={{ color: accent }}>{fmtUSD(remaining)}</strong> → se sumará el nuevo gasto
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Monto del gasto *</label>
                        <input className="input-glass" type="number" placeholder="Ej: 150" value={gastoForm.amount} onChange={e => setGastoForm(f => ({ ...f, amount: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Descripción (opcional)</label>
                        <input className="input-glass" placeholder="Ej: Supermercado, gasolina…" value={gastoForm.description} onChange={e => setGastoForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleNewGasto(card)} disabled={loading || !gastoForm.amount} style={{ flex: 1, background: 'rgba(48,209,88,0.2)', border: '1px solid rgba(48,209,88,0.4)', borderRadius: 8, padding: 10, color: '#30D158', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading || !gastoForm.amount ? 0.5 : 1 }}>
                          {loading ? 'Guardando...' : '+ Agregar al saldo'}
                        </button>
                        <button onClick={() => setGastoCardId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── EDIT PANEL ── */}
                {isEditing && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Editar tarjeta</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input className="input-glass" placeholder="Nombre / apodo" value={editForm.nickname} onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))} style={{ flex: 1 }} />
                        <input className="input-glass" type="number" placeholder="Límite" value={editForm.credit_limit} onChange={e => setEditForm(f => ({ ...f, credit_limit: e.target.value }))} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de corte</label>
                          <input className="input-glass" type="number" min={1} max={31} value={editForm.cut_day} onChange={e => setEditForm(f => ({ ...f, cut_day: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Día de pago</label>
                          <input className="input-glass" type="number" min={1} max={31} value={editForm.payment_due_day} onChange={e => setEditForm(f => ({ ...f, payment_due_day: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Interés % anual</label>
                          <input className="input-glass" type="number" placeholder="17" value={editForm.interest_rate} onChange={e => setEditForm(f => ({ ...f, interest_rate: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Color acento</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {ACCENT_COLORS.map(c => (
                            <div key={c} onClick={() => setEditForm(f => ({ ...f, accent_color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: editForm.accent_color === c ? '3px solid white' : '3px solid transparent', boxShadow: editForm.accent_color === c ? `0 0 8px ${c}` : 'none' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleEditSave(card.id)} disabled={loading} style={{ flex: 1, background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 8, padding: 10, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                          {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditCardId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STATEMENT PANEL ── */}
                {isStatement && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Estado de cuenta · {currentPeriod}
                    </p>
                    {stmt && totalPaid > 0 && (
                      <div style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: 8, padding: '7px 10px', marginBottom: 12 }}>
                        <p style={{ fontSize: 11, color: '#FF9F0A' }}>
                          ⚠️ Esta tarjeta tiene {stmtPays.length} pago{stmtPays.length > 1 ? 's' : ''} registrado{stmtPays.length > 1 ? 's' : ''} ({fmtUSD(totalPaid)} pagado). Al guardar se borran y se reinicia el saldo.
                        </p>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Saldo del estado de cuenta *</label>
                        <input className="input-glass" type="number" placeholder="Ej: 12500" value={stmtForm.closing_balance} onChange={e => setStmtForm(f => ({ ...f, closing_balance: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Pago mínimo (opcional)</label>
                        <input className="input-glass" type="number" placeholder="Ej: 1250" value={stmtForm.minimum_payment} onChange={e => setStmtForm(f => ({ ...f, minimum_payment: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Fecha límite de pago</label>
                        <input className="input-glass" type="date" value={stmtForm.due_date} onChange={e => setStmtForm(f => ({ ...f, due_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-xs" style={{ display: 'block', marginBottom: 6 }}>Estado</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['pending', 'partial', 'paid', 'overdue'] as const).map(s => (
                            <button key={s} onClick={() => setStmtForm(f => ({ ...f, status: s }))} style={{
                              flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              border: stmtForm.status === s ? `1px solid ${s === 'paid' ? '#30D158' : s === 'overdue' ? '#FF453A' : s === 'partial' ? '#FF9F0A' : '#9D7BFF'}` : '1px solid rgba(255,255,255,0.1)',
                              background: stmtForm.status === s ? (s === 'paid' ? 'rgba(48,209,88,0.15)' : s === 'overdue' ? 'rgba(255,69,58,0.15)' : s === 'partial' ? 'rgba(255,159,10,0.15)' : 'rgba(157,123,255,0.15)') : 'rgba(255,255,255,0.04)',
                              color: stmtForm.status === s ? (s === 'paid' ? '#30D158' : s === 'overdue' ? '#FF453A' : s === 'partial' ? '#FF9F0A' : '#9D7BFF') : 'var(--text-muted)',
                            }}>
                              {s === 'pending' ? 'Pendiente' : s === 'partial' ? 'Parcial' : s === 'paid' ? 'Pagado' : 'Vencido'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleStmtSave(card)} disabled={loading || !stmtForm.closing_balance} style={{ flex: 1, background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 8, padding: 10, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading || !stmtForm.closing_balance ? 0.5 : 1 }}>
                          {loading ? 'Guardando...' : 'Guardar estado'}
                        </button>
                        <button onClick={() => setStatementCardId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DIFERIDO PANEL ── */}
                {isDiferido && (() => {
                  const df = diferidoForm
                  const t = parseFloat(df.total_amount), c = parseInt(df.total_installments), r = parseFloat(df.interest_rate_annual)
                  const m = parseFloat(df.monthly_amount)
                  const totalCost = !isNaN(m) && !isNaN(c) ? m * c : 0
                  const totalInterest = !isNaN(t) && totalCost > 0 ? totalCost - t : 0
                  return (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#9D7BFF', marginBottom: 12 }}>📦 Registrar diferido</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input className="input-glass" placeholder="Descripción (ej: iPhone, televisor…)" value={df.description} onChange={e => setDiferidoForm(f => ({ ...f, description: e.target.value }))} />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Monto total *</label>
                          <input className="input-glass" type="number" placeholder="800" value={df.total_amount} onChange={e => { setDiferidoForm(f => ({ ...f, total_amount: e.target.value })); recalcDiferido(e.target.value, df.total_installments, df.interest_rate_annual) }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Nº cuotas *</label>
                          <input className="input-glass" type="number" placeholder="12" min={1} value={df.total_installments} onChange={e => { setDiferidoForm(f => ({ ...f, total_installments: e.target.value })); recalcDiferido(df.total_amount, e.target.value, df.interest_rate_annual) }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={df.has_interest} onChange={e => setDiferidoForm(f => ({ ...f, has_interest: e.target.checked }))} style={{ accentColor: '#9D7BFF', width: 14, height: 14 }} />
                        Tiene interés
                      </label>
                      {df.has_interest && (
                        <div>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Tasa anual % (ej: 18)</label>
                          <input className="input-glass" type="number" placeholder="0 = sin interés adicional" value={df.interest_rate_annual} onChange={e => { setDiferidoForm(f => ({ ...f, interest_rate_annual: e.target.value })); recalcDiferido(df.total_amount, df.total_installments, e.target.value) }} />
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Calcula cuota automáticamente con fórmula de amortización</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Cuota mensual</label>
                          <input className="input-glass" type="number" placeholder="Auto-calculado" value={df.monthly_amount} onChange={e => setDiferidoForm(f => ({ ...f, monthly_amount: e.target.value }))} style={{ color: df.monthly_amount ? '#9D7BFF' : undefined }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Mes de inicio</label>
                          <input className="input-glass" type="month" value={df.start_date} onChange={e => setDiferidoForm(f => ({ ...f, start_date: e.target.value }))} />
                        </div>
                      </div>
                      {df.monthly_amount && df.total_installments && (
                        <div style={{ background: 'rgba(157,123,255,0.08)', border: '1px solid rgba(157,123,255,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Cuota mensual</span>
                            <strong style={{ color: '#9D7BFF' }}>{fmtUSD(m)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total a pagar ({c} cuotas)</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{fmtUSD(totalCost)}</strong>
                          </div>
                          {totalInterest > 0.5 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ color: '#FF9F0A' }}>Intereses</span>
                              <strong style={{ color: '#FF9F0A' }}>+{fmtUSD(totalInterest)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleDiferidoSave(card)} disabled={loading || !df.total_amount || !df.total_installments} style={{ flex: 1, background: 'rgba(157,123,255,0.2)', border: '1px solid rgba(157,123,255,0.4)', borderRadius: 8, padding: 10, color: '#9D7BFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading || !df.total_amount || !df.total_installments ? 0.5 : 1 }}>
                          {loading ? 'Guardando...' : 'Registrar diferido'}
                        </button>
                        <button onClick={() => setDiferidoCardId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })()}

              </div>
            )
          })}
        </div>
      )}

      {/* ── DIFERIDOS SECTION ── */}
      {installments.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800 }}>📦 Diferidos activos</h2>
            <span style={{ fontSize: 11, color: '#9D7BFF', fontWeight: 700 }}>
              {installments.length} compra{installments.length !== 1 ? 's' : ''} · {fmtUSD(installments.reduce((s, i) => s + i.monthly_amount, 0))}/mes
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {installments.map(inst => {
              const card   = cards.find(c => c.id === inst.card_id)
              const accent = card?.accent_color ?? '#9D7BFF'
              const paid   = inst.total_installments - inst.remaining_installments
              const pct    = Math.round((paid / inst.total_installments) * 100)
              return (
                <div key={inst.id} className="glass" style={{ padding: '14px 16px', borderColor: 'rgba(157,123,255,0.15)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #9D7BFF, #9D7BFF44)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>
                          {card?.nickname ?? card?.bank?.name ?? 'Tarjeta'}
                          {card?.last_four && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ••{card.last_four}</span>}
                        </span>
                        {inst.notes?.includes('interés') && (
                          <span style={{ fontSize: 9, background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', color: '#FF9F0A', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>CON INTERÉS</span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{inst.description}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Inicio: {new Date(inst.start_date + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#9D7BFF' }}>{fmtUSD(inst.monthly_amount)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span></p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Resta: <strong style={{ color: 'var(--text-secondary)' }}>{fmtUSD(inst.remaining_balance)}</strong></p>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cuota {paid + 1} de {inst.total_installments}</span>
                      <span style={{ fontSize: 10, color: '#9D7BFF', fontWeight: 700 }}>{pct}% pagado</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #9D7BFF88, #9D7BFF)', borderRadius: 3, boxShadow: '0 0 8px #9D7BFF60', transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                      {Array.from({ length: inst.total_installments }).map((_, i) => (
                        <div key={i} style={{ width: Math.min(16, Math.floor(280 / inst.total_installments) - 2), height: 6, borderRadius: 2, flexShrink: 0, background: i < paid ? '#9D7BFF' : i === paid ? '#9D7BFF44' : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleCancelInstallment(inst.id)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
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
