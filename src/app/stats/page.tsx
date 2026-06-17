import { supabase, getMatchdays, getMatchesForMatchday } from '@/lib/supabase'
import { StatsCharts } from '@/components/StatsCharts'

export const revalidate = 120

export default async function StatsPage() {
  const matchdays = await getMatchdays()

  // Gather aggregated stats across all matches
  const { data: allPredictions } = await supabase
    .from('predictions')
    .select('pts_total, pts_exact_score, pts_goalscorer, goalscorer_pred, is_calculated')

  const { data: leaderboard } = await supabase
    .from('leaderboard_cache')
    .select('*, participant:participants(name)')
    .order('rank')
    .limit(10)

  const { data: matchStats } = await supabase
    .from('match_statistics')
    .select('*, match:matches(home_team, away_team, home_score, away_score)')

  // Aggregate golgheter stats
  const scorerAgg: Record<string, number> = {}
  allPredictions?.forEach(p => {
    if (p.goalscorer_pred && p.pts_goalscorer > 0) {
      scorerAgg[p.goalscorer_pred] = (scorerAgg[p.goalscorer_pred] || 0) + p.pts_goalscorer
    }
  })

  const topScorers = Object.entries(scorerAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const calculated = allPredictions?.filter(p => p.is_calculated) || []
  const totalPredictions = calculated.length
  const exactScores = calculated.filter(p => p.pts_exact_score === 4).length
  const avgPoints = totalPredictions ? (calculated.reduce((s, p) => s + p.pts_total, 0) / totalPredictions).toFixed(1) : '0'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gold-gradient mb-1">Statistici</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm">Analiză și grafice</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Pronosticuri calculate', value: totalPredictions, icon: '📊' },
          { label: 'Scoruri exacte', value: exactScores, icon: '🎯' },
          { label: 'Acuratețe scoruri', value: totalPredictions ? `${Math.round(exactScores / totalPredictions * 100)}%` : '—', icon: '✅' },
          { label: 'Medie puncte/meci', value: avgPoints, icon: '⭐' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-yellow-400">{value}</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts (client component) */}
      <StatsCharts
        leaderboard={(leaderboard || []) as any}
        topScorers={topScorers}
        matchStats={(matchStats || []) as any}
      />
    </div>
  )
}
