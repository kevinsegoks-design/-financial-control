'use client'

import { useRouter } from 'next/navigation'
import type { Workspace } from '@/types/database'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface Props {
  workspaces: Workspace[]
  user: User
}

const WS_META = {
  personal: {
    emoji: '👤',
    label: 'Finanzas Personales',
    desc: 'Tarjetas, diferidos, obligaciones y gastos del hogar',
    accent: '#9D7BFF',
    route: '/personal',
    cls: 'ws-card-personal',
    border: 'rgba(157,123,255,0.15)',
    gradient: 'linear-gradient(135deg, rgba(157,123,255,0.12) 0%, rgba(48,209,88,0.06) 100%)',
  },
  business: {
    emoji: '🏢',
    label: 'Ale New Color',
    desc: 'Proveedores, facturas, pagos parciales y flujo del negocio',
    accent: '#FF6B9D',
    route: '/business',
    cls: 'ws-card-business',
    border: 'rgba(255,107,157,0.15)',
    gradient: 'linear-gradient(135deg, rgba(255,107,157,0.12) 0%, rgba(255,159,10,0.06) 100%)',
  },
}

export default function WorkspaceSelector({ workspaces, user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const personal = workspaces.find(w => w.type === 'personal')
  const business = workspaces.find(w => w.type === 'business')

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
      {/* Nebula bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 25% 30%, rgba(157,123,255,0.05) 0%, transparent 65%), radial-gradient(ellipse 60% 60% at 75% 70%, rgba(255,107,157,0.04) 0%, transparent 65%)',
      }} />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 fade-up">
          <div>
            <p className="label-xs mb-1">Bienvenido</p>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>
              {user.user_metadata?.full_name?.split(' ')[0] ?? 'Hola'} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
              ¿Qué área quieres gestionar?
            </p>
          </div>
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)' }}
            />
          )}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 fade-up-d1">
          {([personal, business] as (Workspace | undefined)[]).map((ws, i) => {
            if (!ws) return null
            const meta = WS_META[ws.type as 'personal' | 'business']
            return (
              <button
                key={ws.id}
                className={`glass ws-card ${meta.cls} text-left p-6`}
                style={{ border: `1px solid ${meta.border}` }}
                onClick={() => router.push(meta.route)}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14, marginBottom: 16,
                  background: meta.gradient,
                  border: `1px solid ${meta.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {meta.emoji}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: meta.accent }}>
                  {meta.label}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                  {meta.desc}
                </p>
                <div style={{
                  marginTop: 20, display: 'flex', alignItems: 'center', gap: 6,
                  color: meta.accent, fontSize: 13, fontWeight: 600,
                }}>
                  Abrir <span style={{ fontSize: 16 }}>→</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="fade-up-d2 text-center mt-8">
          <button
            onClick={handleSignOut}
            style={{ color: 'var(--text-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
