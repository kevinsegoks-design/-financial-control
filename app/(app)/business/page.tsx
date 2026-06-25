import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BusinessDashboard from './BusinessDashboard'

export default async function BusinessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'business').single()
  if (!ws) redirect('/select')

  const [suppliersRes, invoicesRes] = await Promise.all([
    supabase.from('suppliers').select('*').eq('workspace_id', ws.id).eq('status', 'active'),
    supabase.from('supplier_invoices').select('*, supplier:suppliers(name)').eq('workspace_id', ws.id).neq('status', 'paid').neq('status', 'cancelled').order('due_date'),
  ])

  const invoices = invoicesRes.data ?? []
  const totalPending = invoices.reduce((s: number, i: any) => s + i.pending_balance, 0)
  const overdue = invoices.filter((i: any) => {
    const d = Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86_400_000)
    return d < 0 || i.status === 'overdue'
  })

  return (
    <BusinessDashboard
      suppliers={suppliersRes.data ?? []}
      invoices={invoices}
      totalPending={totalPending}
      overdueCount={overdue.length}
    />
  )
}
