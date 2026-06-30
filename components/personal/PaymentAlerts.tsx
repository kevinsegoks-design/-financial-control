'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DueItem } from '@/types/database'
import { fmtUSDCompact } from '@/lib/format'

interface Props {
  items: DueItem[]
  workspaceId: string
}

function daysUntil(dateStr: string) {
  const due = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
}

function getBucket(item: DueItem): 'overdue' | 'today' | 'week' | 'month' {
  if (item.status === 'overdue') return 'overdue'
  const d = daysUntil(item.due_date)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d <= 7) return 'week'
  return 'month'
}

const BUCKET_META = {
  overdue: { label: '🔴 Vencidos', color: '#FF453A', bg: 'rgba(255,69,58,0.08)', border: 'rgba(255,69,58,0.2)' },
  today:   { label: '🟠 Vencen hoy', color: '#FF9F0A', bg: 'rgba(255,159,10,0.08)', border: 'rgba(255,159,10,0.2)' },
  week:    { label: '🟡 Próximos 7 días', color: '#FFD60A', bg: 'rgba(255,214,10,0.06)', border: 'rgba(255,214,10,0.15)' },
  month:   { label: '🟢 Próximos 30 días', color: '#30D158', bg: 'rgba(48,209,88,0.06)', border: 'rgba(48,209,88,0.15)' },
}

const STATUS_EXPLAIN: Record<string, string> = {
  pending:  'El corte llegó, aún no has pagado',
  partial:  'Pagaste algo pero queda saldo pendiente',
  paid:     'Saldado completamente, sin intereses',
  overdue:  'Pasó la fecha límite sin pagar',
}

export default function PaymentAlerts({ items, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [paying, setPaying] = useState<Set<string>>(new Set())
  const [paid, setPaid] = useState<Set<string>>(new Set())

  const visible = items.filter(i => !paid.has(i.id))

  const grouped = {
    overdue: visible.filter(i => getBucket(i) === 'overdue'),
    today:   visible.filter(i => getBucket(i) === 'today'),
    week:    visible.filter(i => getBucket(i) === 'week'),
    month:   visible.filter(i => getBucket(i) === 'month'),
  }

  async function markPaid(item: DueItem) {
    setPaying(prev => new Set(prev).add(item.id))
    const today = new Date().toISOString().split('T')[0]
    if (item.type === 'card_statement') {
      await Promise.all([
        supabase.from('card_statements').update({ status: 'paid', closing_balance: 0 }).eq('id', item.id),
        supabase.from('personal_payments').insert({
          workspace_id: workspaceId,
          card_statement_id: item.id,
          amount: item.amount,
          payment_date: today,
          payment_method: 'transferencia',
        }),
      ])
    } else {
      await Promise.all([
        supabase.from('obligation_periods').update({ status: 'paid', amount_paid: item.amount }).eq('id', item.id),
        supabase.from('personal_payments').insert({
          workspace_id: workspaceId,
          obligation_period_id: item.id,
          amount: item.amount,
          payment_date: today,
          payment_method: 'transferencia',
        }),
      ])
    }
    setPaid(prev => new Set(prev).add(item.id))
    setPaying(prev => { const s = new Set(prev); s.delete(item.id); return s })
    router.refresh()
  }

  const buckets = (['overdue', 'today', 'week', 'month'] as const).filter(b => grouped[b].length > 0)

  if (buckets.length === 0) {
    return (
      <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>Al corriente</p>
        <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>Sin pagos pendientes próximos</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {buckets.map(bucket => {
        const meta = BUCKET_META[bucket]
        const list = grouped[bucket]
        return (
          <div key={bucket} style={{
            background: meta.bg, border: `1px solid ${meta.border}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            {/* Bucket header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: `1px solid ${meta.border}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {fmtUSDCompact(list.reduce((s, i) => s + i.amount, 0))} total
              </span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {list.map((item, idx) => {
                const d = daysUntil(item.due_date)
                const isLast = idx === list.length - 1
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px',
                      borderBottom: isLast ? 'none' : `1px solid ${meta.border}`,
                    }}
                  >
                    {/* Left: name + explanation */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {STATUS_EXPLAIN[item.status] ?? item.status}
                        {item.bank_name ? ` · ${item.bank_name}` : ''}
                      </p>
                    </div>

                    {/* Right: amount + days + button */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>
                        {fmtUSDCompact(item.amount)}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {d < 0 ? `hace ${Math.abs(d)}d` : d === 0 ? 'Hoy' : `en ${d}d`}
                      </p>
                    </div>

                    {/* Pay button */}
                    <button
                      onClick={() => markPaid(item)}
                      disabled={paying.has(item.id)}
                      style={{
                        flexShrink: 0, padding: '6px 10px', borderRadius: 8,
                        background: `${meta.color}18`, border: `1px solid ${meta.color}40`,
                        color: meta.color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        opacity: paying.has(item.id) ? 0.5 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {paying.has(item.id) ? '...' : '✓ Pagar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
