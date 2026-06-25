import BusinessNav from './BusinessNav'

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <BusinessNav />
      <main style={{ flex: 1, padding: '0 0 80px' }}>
        {children}
      </main>
    </div>
  )
}
