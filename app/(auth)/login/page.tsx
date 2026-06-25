'use client'

import { useEffect, useRef } from 'react'

export default function LoginPage() {
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (linkRef.current) {
      const o = encodeURIComponent(window.location.origin)
      linkRef.current.href = `/auth/google?o=${o}`
    }
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(157,123,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 80%, rgba(255,107,157,0.04) 0%, transparent 70%)',
      }} />

      <div className="glass-strong relative z-10 w-full max-w-sm p-8 fade-up">
        <div className="flex justify-center mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(157,123,255,0.3) 0%, rgba(48,209,88,0.2) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            💰
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>
          Control Financiero
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14, marginBottom: 32 }}>
          Gestiona tus finanzas personales y de negocio
        </p>

        <a
          ref={linkRef}
          href="/auth/google"
          className="btn-google"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}
        >
          <GoogleIcon />
          Continuar con Google
        </a>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          Tus datos están protegidos con cifrado y RLS
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
