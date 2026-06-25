import PersonalNav from './PersonalNav'

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <PersonalNav />
      <main style={{ flex: 1, padding: '0 0 80px' }}>
        {children}
      </main>
    </div>
  )
}
