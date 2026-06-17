import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth'
import { createAdminClient, supabase } from '@/lib/supabase'
import type { ParsedPrediction } from '@/types'

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req))) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { matchdayId, predictions }: { matchdayId: string; predictions: ParsedPrediction[] } = await req.json()
  const adminClient = createAdminClient()

  // Load participants to resolve names → IDs
  const { data: participants } = await supabase.from('participants').select('id, name, name_aliases')
  const participantMap = new Map(participants?.map(p => [p.name.toLowerCase(), p.id]) || [])
  // Also map aliases
  participants?.forEach(p => {
    (p.name_aliases || []).forEach((alias: string) => {
      participantMap.set(alias.toLowerCase(), p.id)
    })
  })

  // Load matches to resolve team names → IDs
  const { data: matches } = await supabase.from('matches').select('id, home_team, away_team, home_team_aliases, away_team_aliases').eq('matchday_id', matchdayId)
  const matchMap = new Map<string, string>()
  matches?.forEach(m => {
    matchMap.set(m.home_team.toLowerCase(), m.id)
    matchMap.set(m.away_team.toLowerCase(), m.id)
    ;(m.home_team_aliases || []).forEach((a: string) => matchMap.set(a.toLowerCase(), m.id))
    ;(m.away_team_aliases || []).forEach((a: string) => matchMap.set(a.toLowerCase(), m.id))
  })

  const toInsert = []
  let skipped = 0

  for (const pred of predictions) {
    const participantId = participantMap.get(pred.participantName.toLowerCase())
    const matchId = pred.matchId || matchMap.get(pred.homeTeam.toLowerCase())

    if (!participantId || !matchId) {
      skipped++
      continue
    }

    toInsert.push({
      participant_id: participantId,
      match_id: matchId,
      home_score_pred: pred.homeScore,
      away_score_pred: pred.awayScore,
      goalscorer_pred: pred.goalscorer || null,
      raw_text: pred.rawLine,
      source: 'facebook_import',
    })
  }

  if (toInsert.length > 0) {
    const { error } = await adminClient
      .from('predictions')
      .upsert(toInsert, { onConflict: 'participant_id,match_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update match statistics after import
  const matchIds = [...new Set(toInsert.map(p => p.match_id))]
  for (const matchId of matchIds) {
    await adminClient.rpc('update_match_statistics', { p_match_id: matchId })
  }

  return NextResponse.json({ saved: toInsert.length, skipped })
}
