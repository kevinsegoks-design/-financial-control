import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkspaceSelector from './WorkspaceSelector'
import type { Workspace } from '@/types/database'

export default async function SelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .order('type')

  return <WorkspaceSelector workspaces={(workspaces ?? []) as Workspace[]} user={user} />
}
