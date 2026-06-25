'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Supplier } from '@/types/database'

interface Props {
  suppliers: Supplier[]
  workspaceId: string
}

const CATEGORIES = ['Materias primas', 'Servicios', 'Equipo', 'Logística', 'Marketing', 'Tecnología', 'Otros']

export default function SuppliersClient({ suppliers, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', rfc: '', contact_name: '', email: '', phone: '', category: 'Servicios', notes: '' })

  async function handleSave() {
    if (!form.name) return
    setLoading(true)
    const { error } = await supabase.from('suppliers').insert({ workspace_id: workspaceId, ...form, rfc: form.rfc || null, contact_name: form.contact_name || null, email: form.email || null, phone: form.phone || null, notes: form.notes || null })
    setLoading(false)
    if (!error) { setShowForm(false); setForm({ name: '', rfc: '', contact_name: '', email: '', phone: '', category: 'Servicios', notes: '' }); router.refresh() }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Proveedores</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{suppliers.length} registrado{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'rgba(255,107,157,0.15)', border: '1px solid rgba(255,107,157,0.3)', color: '#FF6B9D', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {showForm && (
        <div className="glass fade-up" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nuevo proveedor</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-glass" placeholder="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" placeholder="RFC" value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value }))} />
              <select className="input-glass" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input className="input-glass" placeholder="Contacto" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-glass" type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <input className="input-glass" placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <textarea className="input-glass" placeholder="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical', minHeight: 60 }} />
            <button onClick={handleSave} disabled={loading || !form.name} style={{ background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.4)', borderRadius: 10, padding: 11, color: '#FF6B9D', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: loading || !form.name ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {suppliers.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 28 }}>🏭</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>Agrega tu primer proveedor</p>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {suppliers.map((s, i) => (
            <div key={s.id} style={{ padding: '14px 16px', borderBottom: i < suppliers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.category}{s.rfc ? ` · ${s.rfc}` : ''}{s.contact_name ? ` · ${s.contact_name}` : ''}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#30D158', background: 'rgba(48,209,88,0.1)', padding: '3px 8px', borderRadius: 6 }}>Activo</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
