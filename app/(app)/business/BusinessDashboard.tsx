'use client'

import CountUp from '@/components/ui/CountUp'
import Link from 'next/link'
import { fmtUSD } from '@/lib/format'
import type { Supplier, SupplierInvoice } from '@/types/database'

interface Props {
  suppliers: Supplier[]
  invoices: SupplierInvoice[]
  totalPending: number
  overdueCount: number
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}

function semColor(d: number): string {
  if (d < 0) return '#FF453A'
  if (d === 0) return '#FF9F0A'
  if (d <= 7) return '#FFD60A'
  return '#30D158'
}

export default function BusinessDashboard({ suppliers, invoices, totalPending, overdueCount }: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero — saldo pendiente */}
      <div className="glass-strong fade-up" style={{
        padding: '28px 24px', textAlign: 'center',
        background: 'rgba(255,107,157,0.04)',
        borderColor: 'rgba(255,107,157,0.12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,107,157,0.05) 0%, transparent 70%)',
        }} />
        <p className="label-xs" style={{ marginBottom: 8 }}>Cuentas por pagar</p>
        <div className="mono" style={{ fontSize: 40, fontWeight: 900, color: '#FF6B9D', lineHeight: 1 }}>
          $<CountUp value={totalPending} decimals={0} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
          {invoices.length} factura{invoices.length !== 1 ? 's' : ''} pendiente{invoices.length !== 1 ? 's' : ''}
        </p>
        {overdueCount > 0 && (
          <div style={{ marginTop: 12, padding: '6px 12px', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ fontSize: 12, color: '#FF453A', fontWeight: 700 }}>⚠️ {overdueCount} vencida{overdueCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="fade-up-d1" style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Proveedores', value: suppliers.length, color: '#9D7BFF', emoji: '🏭' },
          { label: 'Facturas pend.', value: invoices.length, color: '#FF6B9D', emoji: '🧾' },
          { label: 'Vencidas', value: overdueCount, color: '#FF453A', emoji: '⚠️' },
        ].map(stat => (
          <div key={stat.label} className="glass" style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 20 }}>{stat.emoji}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</p>
            <p className="label-xs" style={{ marginTop: 3 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Invoices list */}
      <section className="fade-up-d2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>🧾 Facturas pendientes</h2>
          <Link href="/business/invoices" style={{ fontSize: 11, color: '#FF6B9D', textDecoration: 'none' }}>Ver todas →</Link>
        </div>

        {invoices.length === 0 ? (
          <div className="glass" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 28 }}>✅</p>
            <p style={{ color: '#30D158', fontWeight: 700, marginTop: 8 }}>¡Sin facturas pendientes!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoices.slice(0, 8).map(inv => {
              const d = daysUntil(inv.due_date)
              const color = semColor(d)
              return (
                <div key={inv.id} className="glass" style={{ padding: '12px 14px', borderColor: `${color}18` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.supplier?.name ?? 'Proveedor'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {inv.invoice_number ? `#${inv.invoice_number} · ` : ''}{inv.description ?? ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color }}>
                        {fmtUSD(inv.pending_balance)}
                      </p>
                      <p style={{ fontSize: 10, color, marginTop: 2 }}>
                        {d < 0 ? `hace ${Math.abs(d)}d` : d === 0 ? 'Hoy' : `en ${d}d`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {invoices.length > 8 && (
              <Link href="/business/invoices" style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: 8, textDecoration: 'none' }}>
                +{invoices.length - 8} más →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
