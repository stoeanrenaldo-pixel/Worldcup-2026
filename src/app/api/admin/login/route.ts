import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Parolă incorectă' }, { status: 401 })
  }

  const token = randomBytes(32).toString('hex')
  const adminClient = createAdminClient()

  await adminClient.from('admin_sessions').insert({
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  })

  return NextResponse.json({ token })
}
