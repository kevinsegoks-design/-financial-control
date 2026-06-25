import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoicesClient from './InvoicesClient'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'business').single()
  if (!ws) redirect('/select')

  const [invoicesRes, suppliersRes] = await Promise.all([
    supabase.from('supplier_invoices').select('*, supplier:suppliers(name), payments:invoice_payments(amount,payment_date)').eq('workspace_id', ws.id).order('due_date'),
    supabase.from('suppliers').select('id,name').eq('workspace_id', ws.id).eq('status', 'active'),
  ])

  return <InvoicesClient invoices={invoicesRes.data ?? []} suppliers={suppliersRes.data ?? []} workspaceId={ws.id} />
}
