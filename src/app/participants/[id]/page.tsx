import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ArrowLeft, Trophy, Target, Star, TrendingUp } from 'lucide-react'
import {
  getParticipantById,
  getPredictionsForParticipant,
  getTournamentPrediction,
  supabase,
} from '@/lib/supabase'
import { clsx } from 'clsx'

export const revalidate = 60

interface Props { params: { id: string } }

function getPtsColor(pts: number) {
  if (pts > 0) return 'text-emerald-400'
  if (pts < 0) return 'text-red-400'
  return 'text-gray-600'
}

export default async function ParticipantPage({ params }: Props) {
  const [participant, predictions, tournamentPred] = await Promise.all([
    getParticipantById(params.id),
    getPredictionsForParticipant(params.id),
    getTournamentPrediction(params.id),
  ])

  if (!participant) notFound()

  // Get leaderboard position
  const { data: lbEntry } = await supabase
    .from('leaderboard_cache')
    .select('*')
    .eq('participant_id', params.id)
    .single()

  const totalPoints = lbEntry?.total_points ?? 0
  const rank = lbEntry?.rank ?? '-'
  const matchesExact = lbEntry?.matches_exact ?? 0

  const calculatedPredictions = predictions.filter(p => p.is_calculated)
  const pendingPredictions = predictions.filter(p => !p.is_calculated)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-[rgba(255,255,255,0.4)] hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Înapoi la clasament
      </Link>

      {/* Header */}
      <div className="card mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#242440] border border-[rgba(255,215,0,0.3)] flex items-center justify-center text-2xl font-bold text-yellow-400 shrink-0">
            {participant.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{participant.name}</h1>
            {participant.is_expert && (
              <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5 mt-1">
                <Star size={10} /> Expert
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-yellow-400">{totalPoints}</div>
            <div className="text-xs text-[rgba(255,255,255,0.4)]">puncte totale</div>
            <div className="text-sm text-[rgba(255,255,255,0.6)] mt-1">Loc #{rank}</div>
          </div>
        </div>

        {/* Tournament predictions */}
        <div className="mt-4 pt-4 border-t border-[rgba(255,215,0,0.08)] grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-1">Câștigătoare CM</div>
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-500" />
              <span className="font-medium">{participant.winner_prediction || '—'}</span>
              {tournamentPred?.pts_winner ? (
                <span className="text-xs text-emerald-400 font-bold">+{tournamentPred.pts_winner}p</span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-1">Golgheter</div>
            <div className="flex items-center gap-2">
              <Target size={14} className="text-yellow-500" />
              <span className="font-medium">{participant.golden_boot_prediction || '—'}</span>
              {tournamentPred?.pts_golden_boot ? (
                <span className="text-xs text-emerald-400 font-bold">+{tournamentPred.pts_golden_boot}p</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Meciuri prezise', value: predictions.length, icon: '⚽' },
          { label: 'Scor exact', value: matchesExact, icon: '🎯' },
          { label: 'Meciuri calculate', value: calculatedPredictions.length, icon: '✅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card text-center py-4">
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Prediction history */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-yellow-500" />
        Istoric pronosticuri
      </h2>

      {calculatedPredictions.length === 0 && pendingPredictions.length === 0 && (
        <div className="card text-center py-10 text-[rgba(255,255,255,0.4)]">
          Niciun pronostic înregistrat încă.
        </div>
      )}

      {/* Pending predictions */}
      {pendingPredictions.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2">În așteptare</div>
          {pendingPredictions.map(pred => (
            <div key={pred.id} className="prediction-card opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {(pred as any).match?.home_team} — {(pred as any).match?.away_team}
                  </span>
                </div>
                <div className="score-badge">
                  {pred.home_score_pred}–{pred.away_score_pred}
                </div>
              </div>
              {pred.goalscorer_pred && (
                <div className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                  ⚽ {pred.goalscorer_pred}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calculated predictions */}
      {calculatedPredictions.map(pred => {
        const match = (pred as any).match
        const isExact = pred.pts_exact_score === 4
        const hasResult = match?.home_score !== null

        return (
          <div key={pred.id} className={clsx('prediction-card', isExact && 'border-yellow-500/30')}>
            {/* Match name + date */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-xs text-[rgba(255,255,255,0.4)] mb-0.5">
                  {match?.kickoff_at ? format(new Date(match.kickoff_at), 'dd MMM yyyy', { locale: ro }) : ''}
                </div>
                <div className="font-medium text-sm">
                  {match?.home_team} — {match?.away_team}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={clsx(
                  'text-lg font-bold',
                  pred.pts_total > 0 ? 'text-emerald-400' : pred.pts_total < 0 ? 'text-red-400' : 'text-gray-500'
                )}>
                  {pred.pts_total > 0 ? '+' : ''}{pred.pts_total}p
                </span>
              </div>
            </div>

            {/* Scores */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] text-[rgba(255,255,255,0.3)] mb-1">Pronostic</div>
                <div className="score-badge">
                  {pred.home_score_pred}–{pred.away_score_pred}
                </div>
              </div>
              <div className="text-[rgba(255,255,255,0.3)] text-lg">→</div>
              {hasResult && (
                <div className="text-center">
                  <div className="text-[10px] text-[rgba(255,255,255,0.3)] mb-1">Rezultat</div>
                  <div className={clsx('score-badge', isExact && 'border-yellow-500/50 text-yellow-400')}>
                    {match.home_score}–{match.away_score}
                    {isExact && ' 🎯'}
                  </div>
                </div>
              )}
            </div>

            {/* Points breakdown */}
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] flex flex-wrap gap-2">
              {pred.pts_exact_score > 0 && (
                <span className="text-xs bg-yellow-900/30 text-yellow-400 rounded px-2 py-0.5">
                  Scor exact +{pred.pts_exact_score}
                </span>
              )}
              {pred.pts_correct_outcome > 0 && (
                <span className="text-xs bg-blue-900/30 text-blue-400 rounded px-2 py-0.5">
                  Rezultat corect +{pred.pts_correct_outcome}
                </span>
              )}
              {pred.goalscorer_pred && (
                <span className="text-xs bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] rounded px-2 py-0.5">
                  ⚽ {pred.goalscorer_pred}
                  {pred.pts_goalscorer !== 0 && (
                    <span className={clsx('ml-1 font-bold', getPtsColor(pred.pts_goalscorer))}>
                      {pred.pts_goalscorer > 0 ? '+' : ''}{pred.pts_goalscorer}
                    </span>
                  )}
                </span>
              )}
              {pred.pts_own_goal_penalty < 0 && (
                <span className="text-xs bg-red-900/30 text-red-400 rounded px-2 py-0.5">
                  Autogol {pred.pts_own_goal_penalty}
                </span>
              )}
              {pred.pts_missed_penalty < 0 && (
                <span className="text-xs bg-red-900/30 text-red-400 rounded px-2 py-0.5">
                  Penalty ratat {pred.pts_missed_penalty}
                </span>
              )}
              {pred.pts_red_card_penalty < 0 && (
                <span className="text-xs bg-red-900/30 text-red-400 rounded px-2 py-0.5">
                  Eliminare {pred.pts_red_card_penalty}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
