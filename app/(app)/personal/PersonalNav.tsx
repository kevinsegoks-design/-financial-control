'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/personal',              label: 'Dashboard', emoji: '📊' },
  { href: '/personal/cards',        label: 'Tarjetas',  emoji: '💳' },
  { href: '/personal/obligations',  label: 'Gastos',    emoji: '📋' },
  { href: '/personal/payments',     label: 'Pagos',     emoji: '✅' },
]

export default function PersonalNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header className="glass-strong" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 16px',
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/select" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 18 }}>💰</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Finanzas Personales</span>
        </Link>
        <Link href="/select" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Áreas
        </Link>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10,10,20,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
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
                padding: '10px 4px',
                textDecoration: 'none',
                color: active ? '#9D7BFF' : 'var(--text-muted)',
                transition: 'color 0.15s ease',
                gap: 3,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '0.03em' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
