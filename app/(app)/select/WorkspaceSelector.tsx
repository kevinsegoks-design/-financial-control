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
    desc: 'Tarjetas · Diferidos · Obligaciones · Pagos',
    accent: '#9D7BFF',
    route: '/personal',
    glow: 'rgba(157,123,255,0.25)',
    border: 'rgba(157,123,255,0.2)',
    bg: 'linear-gradient(135deg, rgba(157,123,255,0.1) 0%, rgba(48,209,88,0.05) 100%)',
    tags: ['💳 Tarjetas', '🔄 Diferidos', '📋 Obligaciones'],
  },
  business: {
    emoji: '🏢',
    label: 'Ale New Color',
    desc: 'Proveedores · Facturas · Pagos parciales · Flujo',
    accent: '#FF6B9D',
    route: '/business',
    glow: 'rgba(255,107,157,0.25)',
    border: 'rgba(255,107,157,0.2)',
    bg: 'linear-gradient(135deg, rgba(255,107,157,0.1) 0%, rgba(255,159,10,0.05) 100%)',
    tags: ['🏪 Proveedores', '📄 Facturas', '💰 Pagos'],
  },
}

export default function WorkspaceSelector({ workspaces, user }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const firstName = user.user_metadata?.full_name?.split(' ')[0] ?? 'Hola'
  const avatar = user.user_metadata?.avatar_url

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const personal = workspaces.find(w => w.type === 'personal')
  const business = workspaces.find(w => w.type === 'business')

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 0,
    }}>
      {/* Header */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
        {avatar && (
          <img
            src={avatar}
            alt="Avatar"
            style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '2px solid rgba(157,123,255,0.4)',
              boxShadow: '0 0 20px rgba(157,123,255,0.2)',
              marginBottom: 16,
            }}
          />
        )}
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Bienvenido de vuelta
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {firstName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
          ¿A dónde vas hoy?
        </p>
      </div>

      {/* Workspace cards */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {([personal, business] as (Workspace | undefined)[]).map((ws, i) => {
          if (!ws) return null
          const meta = WS_META[ws.type as 'personal' | 'business']
          return (
            <button
              key={ws.id}
              onClick={() => router.push(meta.route)}
              className={`fade-up-d${i + 1}`}
              style={{
                width: '100%',
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                borderRadius: 20,
                padding: '24px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: `0 4px 24px rgba(0,0,0,0.2)`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${meta.glow}, 0 4px 24px rgba(0,0,0,0.2)`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.2)`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  {/* Icon + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${meta.accent}20`,
                      border: `1px solid ${meta.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {meta.emoji}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: meta.accent, lineHeight: 1.2 }}>
                        {meta.label}
                      </h2>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {ws.name}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {meta.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 11, padding: '3px 8px',
                        background: `${meta.accent}15`,
                        border: `1px solid ${meta.accent}30`,
                        borderRadius: 6, color: 'var(--text-secondary)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: `1px solid ${meta.border}`, paddingTop: 14, marginTop: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: meta.accent }}>
                  Abrir workspace
                </span>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `${meta.accent}20`,
                  border: `1px solid ${meta.accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: meta.accent,
                }}>
                  →
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Sign out */}
      <div className="fade-up-d3" style={{ marginTop: 32 }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, padding: '8px 16px',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
