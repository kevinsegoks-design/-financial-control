'use client'

import type { DueItem } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Props {
  items: DueItem[]
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
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
  overdue: { label: 'Vencidos', cls: 'sem-overdue', color: '#FF453A' },
  today:   { label: 'Vencen hoy', cls: 'sem-today', color: '#FF9F0A' },
  week:    { label: 'Próximos 7 días', cls: 'sem-week', color: '#FFD60A' },
  month:   { label: 'Próximos 30 días', cls: 'sem-month', color: '#30D158' },
}

const fmtMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

export default function DueSemaphore({ items }: Props) {
  const router = useRouter()

  const grouped = {
    overdue: items.filter(i => getBucket(i) === 'overdue'),
    today:   items.filter(i => getBucket(i) === 'today'),
    week:    items.filter(i => getBucket(i) === 'week'),
    month:   items.filter(i => getBucket(i) === 'month'),
  }

  const buckets = (['overdue', 'today', 'week', 'month'] as const).filter(b => grouped[b].length > 0)

  if (buckets.length === 0) {
    return (
      <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
          Sin pagos pendientes próximos
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {buckets.map(bucket => {
        const meta = BUCKET_META[bucket]
        const list = grouped[bucket]
        return (
          <div key={bucket} className={`glass ${meta.cls}`} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div className="sem-dot pulse-dot" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color }}>
                {meta.label}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {fmtMXN(list.reduce((s, i) => s + i.amount, 0))} total
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(item => {
                const d = daysUntil(item.due_date)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8,
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      {item.bank_name && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {item.bank_name}{item.card_last_four ? ` ••${item.card_last_four}` : ''}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                        {fmtMXN(item.amount)}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {d < 0 ? `hace ${Math.abs(d)}d` : d === 0 ? 'Hoy' : `en ${d}d`}
                      </p>
                    </div>
                    {bucket === 'overdue' && (
                      <button
                        onClick={() => router.push('/personal/payments')}
                        style={{
                          fontSize: 11, fontWeight: 600, color: meta.color,
                          background: `${meta.color}18`, border: `1px solid ${meta.color}33`,
                          borderRadius: 6, padding: '4px 8px', cursor: 'pointer', flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Resolver →
                      </button>
                    )}
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
