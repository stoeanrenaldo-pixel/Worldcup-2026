import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { matchId } = await req.json()
  const adminClient = createAdminClient()

  try {
    const { data, error } = await adminClient.rpc('calculate_prediction_points', {
      p_match_id: matchId,
    })

    if (error) throw error

    return NextResponse.json({ updated: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
