'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  invoices: any[]
  suppliers: any[]
  workspaceId: string
}

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
function daysUntil(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) }
function semColor(d: number) { if (d < 0) return '#FF453A'; if (d === 0) return '#FF9F0A'; if (d <= 7) return '#FFD60A'; return '#30D158' }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida', cancelled: 'Cancelada',
}

export default function InvoicesClient({ invoices, suppliers, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    supplier_id: '', invoice_number: '', issue_date: new Date().toISOString().split('T')[0],
    due_date: '', total_amount: '', description: '', notes: '',
  })

  async function handleSave() {
    if (!form.supplier_id || !form.total_amount || !form.due_date) return
    setLoading(true)
    const total = parseFloat(form.total_amount)
    await supabase.from('supplier_invoices').insert({
      workspace_id: workspaceId,
      supplier_id: form.supplier_id,
      invoice_number: form.invoice_number || null,
      issue_date: form.issue_date,
      due_date: form.due_date,
      total_amount: total,
      pending_balance: total,
      description: form.description || null,
      notes: form.notes || null,
    })
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handlePartialPayment(inv: any) {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    setLoading(true)
    await supabase.from('invoice_payments').insert({
      workspace_id: workspaceId,
      invoice_id: inv.id,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transferencia',
    })
    const newBalance = inv.pending_balance - amount
    await supabase.from('supplier_invoices').update({
      pending_balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? 'paid' : 'partial',
    }).eq('id', inv.id)
    setPayingId(null)
    setPayAmount('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Facturas</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{invoices.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'rgba(255,107,157,0.15)', border: '1px solid rgba(255,107,157,0.3)', color: '#FF6B9D', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {/* New invoice form */}
      {showForm && (
        <div className="glass fade-up" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nueva factura</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select className="input-glass" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
              <option value="">Proveedor *</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" placeholder="# Factura" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
              <input className="input-glass" type="number" placeholder="Total *" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Emisión</label>
                <input className="input-glass" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-xs" style={{ display: 'block', marginBottom: 4 }}>Vencimiento *</label>
                <input className="input-glass" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <input className="input-glass" placeholder="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <button onClick={handleSave} disabled={loading || !form.supplier_id || !form.total_amount || !form.due_date} style={{ background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.4)', borderRadius: 10, padding: 11, color: '#FF6B9D', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading || !form.supplier_id ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : 'Guardar factura'}
            </button>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 28 }}>🧾</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>No hay facturas registradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invoices.map(inv => {
            const d = daysUntil(inv.due_date)
            const color = semColor(d)
            const pctPaid = inv.total_amount > 0 ? Math.round(((inv.total_amount - inv.pending_balance) / inv.total_amount) * 100) : 0
            const isPaying = payingId === inv.id
            return (
              <div key={inv.id} className="glass" style={{ padding: 14, borderColor: `${color}18` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{inv.supplier?.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {inv.invoice_number ? `#${inv.invoice_number}` : ''}{inv.description ? ` · ${inv.description}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color }}>{fmtMXN(inv.pending_balance)}</p>
                    <p style={{ fontSize: 10, color, marginTop: 2 }}>
                      {d < 0 ? `hace ${Math.abs(d)}d` : d === 0 ? 'Hoy' : `en ${d}d`}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {pctPaid > 0 && (
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctPaid}%`, background: color, borderRadius: 2 }} />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 6 }}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <button
                      onClick={() => { setPayingId(isPaying ? null : inv.id); setPayAmount('') }}
                      style={{ fontSize: 11, fontWeight: 600, color: '#FF6B9D', background: 'rgba(255,107,157,0.12)', border: '1px solid rgba(255,107,157,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      {isPaying ? 'Cancelar' : 'Registrar pago'}
                    </button>
                  )}
                </div>

                {isPaying && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input
                      className="input-glass"
                      type="number"
                      placeholder={`Máx: ${inv.pending_balance}`}
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                    />
                    <button
                      onClick={() => handlePartialPayment(inv)}
                      disabled={loading || !payAmount}
                      style={{ background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.4)', color: '#FF6B9D', borderRadius: 8, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !payAmount ? 0.5 : 1 }}
                    >
                      {loading ? '...' : 'Pagar ✓'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
