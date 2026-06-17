import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { parseFacebookComments } from '@/lib/parser'

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { matchdayId, rawText } = await req.json()

  // Load matches and participants
  const [matchesRes, participantsRes] = await Promise.all([
    supabase.from('matches').select('*').eq('matchday_id', matchdayId),
    supabase.from('participants').select('*'),
  ])

  if (matchesRes.error) return NextResponse.json({ error: matchesRes.error.message }, { status: 500 })
  if (participantsRes.error) return NextResponse.json({ error: participantsRes.error.message }, { status: 500 })

  const result = await parseFacebookComments(
    rawText,
    matchesRes.data,
    participantsRes.data,
    true // use AI
  )

  return NextResponse.json(result)
}
