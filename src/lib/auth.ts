import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function verifyAdminToken(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('x-admin-token')
  if (!token) return false

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return !!data
}
