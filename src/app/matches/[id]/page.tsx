import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { clsx } from 'clsx'
import {
  getMatchById, getPredictionsForMatch,
  getMatchStatistics, getMatchGoalscorers, getMatchEvents
} from '@/lib/supabase'

export const revalidate = 30

interface Props { params: { id: string } }

export default async function MatchPage({ params }: Props) {
  const [match, predictions, stats, goalscorers, events] = await Promise.all([
    getMatchById(params.id),
    getPredictionsForMatch(params.id),
    getMatchStatistics(params.id),
    getMatchGoalscorers(params.id),
    getMatchEvents(params.id),
  ])

  if (!match) notFound()

  const hasResult = match.home_score !== null
  const kickoff = match.kickoff_at ? new Date(match.kickoff_at) : null

  const topScores = stats
    ? Object.entries(stats.score_distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : []

  const topScorers = stats
    ? Object.entries(stats.goalscorer_distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : []

  const total = stats?.total_predictions || predictions.length || 1

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/matches" className="inline-flex items-center gap-2 text-sm text-[rgba(255,255,255,0.4)] hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Înapoi la meciuri
      </Link>

      {/* Match hero */}
      <div className="card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent pointer-events-none" />
        <div className="relative">
          {/* Group + time */}
          <div className="text-center text-xs text-[rgba(255,255,255,0.4)] mb-4">
            {match.group_name} •{' '}
            {kickoff ? format(kickoff, 'dd MMMM yyyy, HH:mm', { locale: ro }) : ''}
          </div>

          {/* Teams + score */}
          <div className="flex items-center justify-around gap-4">
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{match.home_team_flag}</div>
              <div className="font-bold text-lg">{match.home_team}</div>
            </div>

            <div className="text-center shrink-0">
              {hasResult ? (
                <div className="text-4xl font-black text-yellow-400 font-mono">
                  {match.home_score} – {match.away_score}
                </div>
              ) : (
                <div className="text-2xl text-[rgba(255,255,255,0.3)] font-medium">vs</div>
              )}
              {hasResult && (
                <div className="text-xs text-[rgba(255,255,255,0.3)] mt-1">Rezultat final</div>
              )}
            </div>

            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{match.away_team_flag}</div>
              <div className="font-bold text-lg">{match.away_team}</div>
            </div>
          </div>

          {/* Goalscorers */}
          {goalscorers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,215,0,0.08)]">
              <div className="flex flex-wrap gap-2 justify-center">
                {goalscorers.map(gs => (
                  <span key={gs.id} className={clsx(
                    'text-xs px-2 py-1 rounded-full border',
                    gs.is_own_goal
                      ? 'bg-red-900/30 text-red-400 border-red-800/30'
                      : 'bg-[rgba(255,215,0,0.08)] text-yellow-400 border-[rgba(255,215,0,0.15)]'
                  )}>
                    ⚽ {gs.player_name}{gs.goals > 1 ? ` x${gs.goals}` : ''}{gs.is_own_goal ? ' (autogol)' : ''}
                  </span>
                ))}
                {events.map(ev => (
                  <span key={ev.id} className="text-xs px-2 py-1 rounded-full border bg-red-900/30 text-red-400 border-red-800/30">
                    {ev.event_type === 'red_card' ? '🟥' : '❌'} {ev.player_name}
                    {ev.event_type === 'missed_penalty' ? ' (penalty ratat)' : ' (eliminat)'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Score distribution */}
          {topScores.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-4 text-[rgba(255,255,255,0.7)]">
                📊 Scoruri pronosticate
              </h3>
              <div className="space-y-2">
                {topScores.map(([score, count]) => (
                  <div key={score} className="flex items-center gap-2">
                    <div className="font-mono text-sm font-bold text-yellow-400 w-10 shrink-0">
                      {score}
                    </div>
                    <div className="flex-1 progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.5)] w-16 text-right shrink-0">
                      {count} ({Math.round((count / total) * 100)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goalscorer distribution */}
          {topScorers.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-4 text-[rgba(255,255,255,0.7)]">
                ⚽ Marcatori pronosticați
              </h3>
              <div className="space-y-2">
                {topScorers.map(([player, count]) => (
                  <div key={player} className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate flex-1">{player}</div>
                    <div className="w-24 progress-bar shrink-0">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.5)] w-8 text-right shrink-0">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All predictions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 bg-[#0f0f1a] border-b border-[rgba(255,215,0,0.08)] flex items-center justify-between">
          <h3 className="font-semibold text-sm">Toate pronosticurile ({predictions.length})</h3>
          {hasResult && (
            <span className="text-xs text-[rgba(255,255,255,0.4)]">
              {predictions.filter(p => p.pts_exact_score === 4).length} scoruri exacte
            </span>
          )}
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          {predictions.map(pred => {
            const participant = (pred as any).participant
            const isExact = pred.pts_exact_score === 4
            return (
              <Link
                key={pred.id}
                href={`/participants/${pred.participant_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,215,0,0.03)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{participant?.name}</div>
                  {pred.goalscorer_pred && (
                    <div className="text-xs text-[rgba(255,255,255,0.4)]">⚽ {pred.goalscorer_pred}</div>
                  )}
                </div>
                <div className={clsx('score-badge', isExact && 'border-yellow-500/50')}>
                  {pred.home_score_pred}–{pred.away_score_pred}
                  {isExact && ' 🎯'}
                </div>
                {pred.is_calculated && (
                  <div className={clsx(
                    'text-sm font-bold w-12 text-right',
                    pred.pts_total > 0 ? 'text-emerald-400' : pred.pts_total < 0 ? 'text-red-400' : 'text-gray-600'
                  )}>
                    {pred.pts_total > 0 ? '+' : ''}{pred.pts_total}p
                  </div>
                )}
              </Link>
            )
          })}
          {predictions.length === 0 && (
            <div className="px-4 py-10 text-center text-[rgba(255,255,255,0.3)] text-sm">
              Niciun pronostic importat pentru acest meci.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
