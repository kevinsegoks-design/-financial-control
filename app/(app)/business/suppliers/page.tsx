import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuppliersClient from './SuppliersClient'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ws } = await supabase.from('workspaces').select('id').eq('type', 'business').single()
  if (!ws) redirect('/select')

  const { data: suppliers } = await supabase.from('suppliers').select('*').eq('workspace_id', ws.id).order('name')
  return <SuppliersClient suppliers={suppliers ?? []} workspaceId={ws.id} />
}
