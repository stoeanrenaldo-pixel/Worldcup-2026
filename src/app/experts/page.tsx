import { getExperts, getMatchdays, getMatchesForMatchday, supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { clsx } from 'clsx'
import type { Prediction } from '@/types'

export const revalidate = 60

export default async function ExpertsPage() {
  const [experts, matchdays] = await Promise.all([
    getExperts(),
    getMatchdays(),
  ])

  // Get latest matchday with matches
  const latestMatchday = matchdays[0] ?? null
  const matches = latestMatchday ? await getMatchesForMatchday(latestMatchday.id) : []

  // Fetch all expert predictions for today's matches
  let expertPredictions: Prediction[] = []
  if (matches.length > 0 && experts.length > 0) {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .in('match_id', matches.map(m => m.id))
      .in('participant_id', experts.map(e => e.id))
    expertPredictions = data || []
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gold-gradient mb-1">Experți</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm">
          Pronosticurile experților față în față
        </p>
      </div>

      {/* Expert cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {experts.map(expert => (
          <div key={expert.id} className="expert-card text-center">
            <div className="w-10 h-10 rounded-full bg-[#242440] border border-yellow-500/30 flex items-center justify-center text-lg font-bold text-yellow-400 mx-auto mb-2">
              {expert.name.charAt(0)}
            </div>
            <div className="text-sm font-semibold truncate">{expert.name.split(' ')[0]}</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-1">
              🏆 {expert.winner_prediction}
            </div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)]">
              ⚽ {expert.golden_boot_prediction}
            </div>
          </div>
        ))}
      </div>

      {/* Day selector info */}
      {latestMatchday && (
        <div className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
          Afișând:{' '}
          <span className="text-yellow-400 font-medium">
            {latestMatchday.label || format(new Date(latestMatchday.match_date + 'T12:00:00'), 'dd MMMM yyyy', { locale: ro })}
          </span>
        </div>
      )}

      {/* Match-by-match comparison */}
      <div className="space-y-6">
        {matches.map(match => {
          const matchPreds = expertPredictions.filter(p => p.match_id === match.id)

          // Compute consensus
          const scores = matchPreds.map(p => `${p.home_score_pred}-${p.away_score_pred}`)
          const scoreCounts: Record<string, number> = {}
          scores.forEach(s => { scoreCounts[s] = (scoreCounts[s] || 0) + 1 })
          const consensusScore = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

          const scorers = matchPreds.filter(p => p.goalscorer_pred).map(p => p.goalscorer_pred!)
          const scorerCounts: Record<string, number> = {}
          scorers.forEach(s => { scorerCounts[s] = (scorerCounts[s] || 0) + 1 })
          const consensusScorer = Object.entries(scorerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

          const hasResult = match.home_score !== null

          return (
            <div key={match.id} className="card p-0 overflow-hidden">
              {/* Match header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] border-b border-[rgba(255,215,0,0.08)]">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{match.home_team_flag}</span>
                  <span className="font-bold">{match.home_team}</span>
                  <span className="text-[rgba(255,255,255,0.3)]">–</span>
                  <span className="font-bold">{match.away_team}</span>
                  <span className="text-lg">{match.away_team_flag}</span>
                </div>
                {hasResult && (
                  <div className="score-badge text-yellow-400">
                    {match.home_score}–{match.away_score}
                  </div>
                )}
              </div>

              {/* Expert predictions grid */}
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                  {experts.map(expert => {
                    const pred = matchPreds.find(p => p.participant_id === expert.id)
                    const isExact = pred && hasResult && pred.pts_exact_score === 4

                    return (
                      <div key={expert.id} className={clsx(
                        'bg-[#0f0f1a] rounded-lg p-3 text-center',
                        isExact && 'ring-1 ring-yellow-500/50'
                      )}>
                        <div className="text-[10px] text-[rgba(255,255,255,0.4)] mb-2 truncate">
                          {expert.name.split(' ')[0]}
                        </div>
                        {pred ? (
                          <>
                            <div className={clsx(
                              'font-mono font-bold text-sm',
                              isExact ? 'text-yellow-400' : 'text-white'
                            )}>
                              {pred.home_score_pred}–{pred.away_score_pred}
                              {isExact && ' 🎯'}
                            </div>
                            {pred.goalscorer_pred && (
                              <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-1 truncate">
                                ⚽ {pred.goalscorer_pred}
                              </div>
                            )}
                            {pred.is_calculated && (
                              <div className={clsx(
                                'text-xs font-bold mt-1',
                                pred.pts_total > 0 ? 'text-emerald-400' : pred.pts_total < 0 ? 'text-red-400' : 'text-gray-600'
                              )}>
                                {pred.pts_total > 0 ? '+' : ''}{pred.pts_total}p
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[rgba(255,255,255,0.2)] text-sm">—</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Consensus */}
                {(consensusScore || consensusScorer) && (
                  <div className="flex items-center gap-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
                    <span className="text-xs text-[rgba(255,255,255,0.4)]">Consens:</span>
                    {consensusScore && (
                      <span className="text-xs font-bold text-yellow-400">
                        📊 {consensusScore}
                      </span>
                    )}
                    {consensusScorer && (
                      <span className="text-xs text-[rgba(255,255,255,0.6)]">
                        ⚽ {consensusScorer}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {matches.length === 0 && (
          <div className="card text-center py-16 text-[rgba(255,255,255,0.3)]">
            <div className="text-4xl mb-3">⭐</div>
            <p>Nu există meciuri pentru ziua curentă.</p>
          </div>
        )}
      </div>
    </div>
  )
}
