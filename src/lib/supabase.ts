// =============================================================
// SUPABASE CLIENT + DATA ACCESS LAYER
// =============================================================

import { createClient } from '@supabase/supabase-js'
import type {
  Participant, Matchday, Match, Prediction, LeaderboardEntry,
  MatchGoalscorer, MatchEvent, MatchStatistics, TournamentPrediction,
  LeaderboardWithColumns, ExpertComparison
} from '@/types'

// Browser client (public read)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server/admin client (bypasses RLS)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// =============================================================
// PARTICIPANTS
// =============================================================

export async function getParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getExperts(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('is_expert', true)
    .order('expert_order')
  if (error) throw error
  return data
}

export async function getParticipantById(id: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

// =============================================================
// MATCHDAYS & MATCHES
// =============================================================

export async function getMatchdays(): Promise<Matchday[]> {
  const { data, error } = await supabase
    .from('matchdays')
    .select('*')
    .order('match_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getMatchdayWithMatches(matchdayId: string): Promise<{
  matchday: Matchday
  matches: Match[]
} | null> {
  const { data: matchday, error: mdError } = await supabase
    .from('matchdays')
    .select('*')
    .eq('id', matchdayId)
    .single()
  if (mdError) return null

  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('*')
    .eq('matchday_id', matchdayId)
    .order('kickoff_at')
  if (mError) throw mError

  return { matchday, matches }
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  if (error) return null
  return data
}

export async function getMatchesForMatchday(matchdayId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('matchday_id', matchdayId)
    .order('kickoff_at')
  if (error) throw error
  return data
}

// =============================================================
// PREDICTIONS
// =============================================================

export async function getPredictionsForMatch(matchId: string): Promise<(Prediction & { participant: Participant })[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, participant:participants(*)')
    .eq('match_id', matchId)
    .order('pts_total', { ascending: false })
  if (error) throw error
  return data as any
}

export async function getPredictionsForParticipant(participantId: string): Promise<(Prediction & { match: Match })[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*, match:matches(*)')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as any
}

export async function getTournamentPrediction(participantId: string): Promise<TournamentPrediction | null> {
  const { data, error } = await supabase
    .from('tournament_predictions')
    .select('*')
    .eq('participant_id', participantId)
    .single()
  if (error) return null
  return data
}

// =============================================================
// LEADERBOARD
// =============================================================

export async function getLeaderboard(): Promise<LeaderboardWithColumns> {
  const [leaderboardRes, matchdaysRes] = await Promise.all([
    supabase
      .from('leaderboard_cache')
      .select('*, participant:participants(*)')
      .order('rank'),
    supabase
      .from('matchdays')
      .select('*')
      .order('match_date'),
  ])

  if (leaderboardRes.error) throw leaderboardRes.error
  if (matchdaysRes.error) throw matchdaysRes.error

  return {
    entries: leaderboardRes.data as any,
    matchdays: matchdaysRes.data,
    totalMatchdays: matchdaysRes.data.length,
  }
}

// =============================================================
// STATISTICS
// =============================================================

export async function getMatchStatistics(matchId: string): Promise<MatchStatistics | null> {
  const { data, error } = await supabase
    .from('match_statistics')
    .select('*')
    .eq('match_id', matchId)
    .single()
  if (error) return null
  return data
}

// =============================================================
// EXPERT COMPARISON
// =============================================================

export async function getExpertComparisons(matchdayId: string): Promise<ExpertComparison[]> {
  const [expertsRes, matchesRes] = await Promise.all([
    getExperts(),
    getMatchesForMatchday(matchdayId),
  ])

  const comparisons: ExpertComparison[] = []

  for (const match of matchesRes) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)
      .in('participant_id', expertsRes.map(e => e.id))

    const expertPredictions = expertsRes.map(expert => ({
      expert,
      prediction: (preds || []).find(p => p.participant_id === expert.id) as Prediction | null,
    }))

    // Calculate consensus
    const scores = expertPredictions
      .filter(ep => ep.prediction)
      .map(ep => `${ep.prediction!.home_score_pred}-${ep.prediction!.away_score_pred}`)
    
    const scoreCounts: Record<string, number> = {}
    scores.forEach(s => { scoreCounts[s] = (scoreCounts[s] || 0) + 1 })
    const consensusScore = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const scorers = expertPredictions
      .filter(ep => ep.prediction?.goalscorer_pred)
      .map(ep => ep.prediction!.goalscorer_pred!)
    const scorerCounts: Record<string, number> = {}
    scorers.forEach(s => { scorerCounts[s] = (scorerCounts[s] || 0) + 1 })
    const consensusScorer = Object.entries(scorerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    comparisons.push({
      match,
      predictions: expertPredictions,
      consensus: { score: consensusScore, goalscorer: consensusScorer },
    })
  }

  return comparisons
}

// =============================================================
// GOALSCORERS & EVENTS (for match detail)
// =============================================================

export async function getMatchGoalscorers(matchId: string): Promise<MatchGoalscorer[]> {
  const { data, error } = await supabase
    .from('match_goalscorers')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw error
  return data
}

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw error
  return data
}

// =============================================================
// ADMIN WRITE OPERATIONS (use service role key in API routes)
// =============================================================

export async function adminCreateMatchday(
  adminClient: ReturnType<typeof createAdminClient>,
  date: string,
  label: string
): Promise<Matchday> {
  const { data, error } = await adminClient
    .from('matchdays')
    .insert({ match_date: date, label })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function adminCreateMatches(
  adminClient: ReturnType<typeof createAdminClient>,
  matchdayId: string,
  matches: { home_team: string; away_team: string; group_name?: string; kickoff_at?: string; home_team_flag?: string; away_team_flag?: string }[]
): Promise<Match[]> {
  const { data, error } = await adminClient
    .from('matches')
    .insert(matches.map(m => ({ ...m, matchday_id: matchdayId })))
    .select()
  if (error) throw error
  return data
}

export async function adminSavePredictions(
  adminClient: ReturnType<typeof createAdminClient>,
  predictions: { participant_id: string; match_id: string; home_score_pred: number; away_score_pred: number; goalscorer_pred?: string | null; raw_text?: string }[]
): Promise<void> {
  const { error } = await adminClient
    .from('predictions')
    .upsert(predictions, { onConflict: 'participant_id,match_id' })
  if (error) throw error
}

export async function adminEnterResult(
  adminClient: ReturnType<typeof createAdminClient>,
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const { error } = await adminClient
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, result_entered_at: new Date().toISOString() })
    .eq('id', matchId)
  if (error) throw error
}

export async function adminSaveGoalscorers(
  adminClient: ReturnType<typeof createAdminClient>,
  matchId: string,
  goalscorers: { player_name: string; goals: number; is_own_goal: boolean }[]
): Promise<void> {
  // Delete existing
  await adminClient.from('match_goalscorers').delete().eq('match_id', matchId)
  if (!goalscorers.length) return
  const { error } = await adminClient
    .from('match_goalscorers')
    .insert(goalscorers.map(g => ({ ...g, match_id: matchId })))
  if (error) throw error
}

export async function adminSaveEvents(
  adminClient: ReturnType<typeof createAdminClient>,
  matchId: string,
  events: { event_type: string; player_name: string }[]
): Promise<void> {
  await adminClient.from('match_events').delete().eq('match_id', matchId)
  if (!events.length) return
  const { error } = await adminClient
    .from('match_events')
    .insert(events.map(e => ({ ...e, match_id: matchId })))
  if (error) throw error
}

export async function adminCalculatePoints(
  matchId: string
): Promise<{ updated: number }> {
  const res = await fetch('/api/admin/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId }),
  })
  if (!res.ok) throw new Error('Calculation failed')
  return res.json()
}
