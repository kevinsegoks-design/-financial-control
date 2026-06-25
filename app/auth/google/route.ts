import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const originParam = searchParams.get('o')
  const origin = originParam ? decodeURIComponent(originParam) : 'http://localhost:3000'
  const redirectTo = `${origin}/auth/callback`

  console.log('[auth/google] origin param:', originParam)
  console.log('[auth/google] redirectTo que se enviará a Supabase:', redirectTo)

  const captured: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) { captured.push(...(cookiesToSet as typeof captured)) },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
      skipBrowserRedirect: true,
    },
  })

  console.log('[auth/google] URL generada por Supabase:', data?.url)

  if (error || !data?.url) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
  }

  const response = NextResponse.redirect(data.url)
  captured.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )
  return response
}
