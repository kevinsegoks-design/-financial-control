import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/select'

  console.log('[callback] URL recibida:', request.url)
  console.log('[callback] code presente:', !!code)
  console.log('[callback] cookies entrantes:', request.cookies.getAll().map(c => c.name))

  if (!code) {
    console.error('[callback] No se recibió code en la URL')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const captured: Array<{ name: string; value: string; options: ResponseCookie }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          captured.push(...(cookiesToSet as typeof captured))
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log('[callback] exchangeCodeForSession error:', JSON.stringify(error))
  console.log('[callback] session obtenida:', !!data?.session)
  console.log('[callback] cookies a setear:', captured.map(c => c.name))

  if (!error && data?.session) {
    const response = NextResponse.redirect(`${origin}${next}`)
    captured.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  const errorMsg = error?.message ?? 'unknown'
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`)
}
