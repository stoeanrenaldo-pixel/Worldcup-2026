import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { createAdminClient, adminCreateMatchday, adminCreateMatches } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { date, label, matches } = await req.json()
  const adminClient = createAdminClient()

  try {
    const matchday = await adminCreateMatchday(adminClient, date, label)
    const createdMatches = await adminCreateMatches(adminClient, matchday.id, matches)

    return NextResponse.json({ matchday, matches: createdMatches })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
