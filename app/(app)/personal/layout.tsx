import PersonalNav from './PersonalNav'

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Ambient orbs — decorative only */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '5%', right: '-20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(157,123,255,0.055) 0%, transparent 65%)',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '-25%',
          width: 450, height: 450, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(48,209,88,0.04) 0%, transparent 65%)',
          animation: 'float 10s ease-in-out infinite 2s',
        }} />
        <div style={{
          position: 'absolute', top: '45%', right: '10%',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,157,0.03) 0%, transparent 65%)',
          animation: 'float 12s ease-in-out infinite 4s',
        }} />
      </div>

      <PersonalNav />
      <main style={{ flex: 1, padding: '0 0 80px', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}
