import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { createAdminClient, adminEnterResult, adminSaveGoalscorers, adminSaveEvents } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { matchId, homeScore, awayScore, goalscorers, events } = await req.json()
  const adminClient = createAdminClient()

  try {
    await adminEnterResult(adminClient, matchId, homeScore, awayScore)
    await adminSaveGoalscorers(adminClient, matchId, goalscorers || [])
    await adminSaveEvents(adminClient, matchId, events || [])

    // Update statistics
    await adminClient.rpc('update_match_statistics', { p_match_id: matchId })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
