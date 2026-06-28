'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/personal',             label: 'Inicio',    emoji: '📊' },
  { href: '/personal/cards',       label: 'Tarjetas',  emoji: '💳' },
  { href: '/personal/obligations', label: 'Gastos',    emoji: '📋' },
  { href: '/personal/payments',    label: 'Pagos',     emoji: '✅' },
]

export default function PersonalNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0 16px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,10,20,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/select" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(157,123,255,0.3), rgba(48,209,88,0.2))',
            border: '1px solid rgba(157,123,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            💰
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Finanzas</span>
        </Link>
        <Link href="/select" style={{
          fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
        }}>
          ← Áreas
        </Link>
      </header>

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10,10,20,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/personal' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 4px 10px',
                textDecoration: 'none',
                color: active ? '#9D7BFF' : 'var(--text-muted)',
                gap: 3, position: 'relative',
                transition: 'color 0.15s ease',
              }}
            >
              {/* Active indicator line at top */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                  background: 'linear-gradient(90deg, transparent, #9D7BFF, transparent)',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}

              {/* Icon with optional glow */}
              <span style={{
                fontSize: active ? 22 : 20,
                filter: active ? 'drop-shadow(0 0 6px rgba(157,123,255,0.7))' : 'none',
                transition: 'font-size 0.15s ease, filter 0.15s ease',
              }}>
                {item.emoji}
              </span>

              <span style={{
                fontSize: 10, letterSpacing: '0.03em',
                fontWeight: active ? 700 : 400,
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
