import { getMatchdays, getMatchesForMatchday, getMatchStatistics } from '@/lib/supabase'
import Link from 'next/link'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { clsx } from 'clsx'

export const revalidate = 60

export default async function MatchesPage() {
  const matchdays = await getMatchdays()

  const matchdaysWithMatches = await Promise.all(
    matchdays.map(async (md) => ({
      matchday: md,
      matches: await getMatchesForMatchday(md.id),
    }))
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gold-gradient mb-1">Meciuri</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm">
          Toate zilele de joc și rezultatele
        </p>
      </div>

      <div className="space-y-6">
        {matchdaysWithMatches.map(({ matchday, matches }) => (
          <div key={matchday.id} className="card p-0 overflow-hidden">
            {/* Matchday header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] border-b border-[rgba(255,215,0,0.08)]">
              <div>
                <div className="font-bold text-yellow-400">
                  {matchday.label || format(new Date(matchday.match_date + 'T12:00:00'), 'EEEE', { locale: ro })}
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.4)]">
                  {format(new Date(matchday.match_date + 'T12:00:00'), 'dd MMMM yyyy', { locale: ro })}
                </div>
              </div>
              <div className="text-xs text-[rgba(255,255,255,0.3)]">
                {matches.length} meciuri
              </div>
            </div>

            {/* Matches */}
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {matches.map(match => {
                const hasResult = match.home_score !== null
                const kickoff = match.kickoff_at ? new Date(match.kickoff_at) : null

                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-[rgba(255,215,0,0.03)] transition-colors"
                  >
                    {/* Group + time */}
                    <div className="text-right min-w-[64px] shrink-0">
                      <div className="text-[10px] text-[rgba(255,255,255,0.3)]">{match.group_name}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.5)]">
                        {kickoff ? format(kickoff, 'HH:mm') : '—'}
                      </div>
                    </div>

                    {/* Home team */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-sm font-medium text-right hidden sm:block">{match.home_team}</span>
                      <span className="text-sm font-medium text-right sm:hidden">
                        {match.home_team.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="team-flag">{match.home_team_flag}</span>
                    </div>

                    {/* Score */}
                    <div className="shrink-0 mx-2">
                      {hasResult ? (
                        <div className="score-badge text-base min-w-[56px] justify-center">
                          {match.home_score} – {match.away_score}
                        </div>
                      ) : (
                        <div className="min-w-[56px] text-center text-[rgba(255,255,255,0.3)] text-sm font-medium">
                          vs
                        </div>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-2 flex-1">
                      <span className="team-flag">{match.away_team_flag}</span>
                      <span className="text-sm font-medium hidden sm:block">{match.away_team}</span>
                      <span className="text-sm font-medium sm:hidden">
                        {match.away_team.slice(0, 3).toUpperCase()}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {hasResult ? (
                        <span className="text-[10px] bg-emerald-900/30 text-emerald-400 rounded-full px-2 py-0.5">
                          Final
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.3)] rounded-full px-2 py-0.5">
                          {kickoff && kickoff < new Date() ? 'Live?' : 'Programat'}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {matchdays.length === 0 && (
          <div className="card text-center py-16 text-[rgba(255,255,255,0.3)]">
            <div className="text-4xl mb-3">⚽</div>
            <p>Nu există zile de joc create încă.</p>
          </div>
        )}
      </div>
    </div>
  )
}
