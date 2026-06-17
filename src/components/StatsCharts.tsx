'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

interface Props {
  leaderboard: { total_points: number; participant: { name: string } }[]
  topScorers: [string, number][]
  matchStats: {
    score_distribution: Record<string, number>
    match: { home_team: string; away_team: string }
  }[]
}

const GOLD = '#FFD700'
const GOLD_DIM = '#C9A227'
const COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FFB347', '#FFD700']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-[rgba(255,215,0,0.2)] rounded-lg px-3 py-2 text-sm">
      <p className="text-[rgba(255,255,255,0.6)] mb-1">{label}</p>
      <p className="text-yellow-400 font-bold">{payload[0].value} puncte</p>
    </div>
  )
}

export function StatsCharts({ leaderboard, topScorers, matchStats }: Props) {
  const leaderboardData = leaderboard.map(e => ({
    name: e.participant?.name?.split(' ')[0] || '?',
    points: e.total_points,
  }))

  const scorerData = topScorers.map(([name, pts]) => ({
    name: name.split(' ').pop() || name,
    pts,
  }))

  // Aggregate top scores across all matches
  const allScores: Record<string, number> = {}
  matchStats.forEach(ms => {
    Object.entries(ms.score_distribution || {}).forEach(([score, count]) => {
      allScores[score] = (allScores[score] || 0) + (count as number)
    })
  })
  const topScoresData = Object.entries(allScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([score, count]) => ({ score, count }))

  return (
    <div className="space-y-6">
      {/* Top 10 Leaderboard Bar Chart */}
      {leaderboardData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-4">
            🏆 Top 10 — Clasament puncte
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leaderboardData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,215,0,0.04)' }} />
              <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                {leaderboardData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === 0 ? GOLD : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : GOLD_DIM}
                    opacity={index < 3 ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Most popular scores */}
      {topScoresData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-4">
            📊 Cele mai populare scoruri pronosticate
          </h3>
          <div className="space-y-2">
            {topScoresData.map(({ score, count }) => {
              const maxCount = topScoresData[0].count
              return (
                <div key={score} className="flex items-center gap-3">
                  <div className="font-mono text-sm font-bold text-yellow-400 w-12 shrink-0">{score}</div>
                  <div className="flex-1 progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-[rgba(255,255,255,0.5)] w-8 text-right shrink-0">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goalscorer success */}
      {scorerData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-4">
            ⚽ Marcatori care au adus cele mai multe puncte
          </h3>
          <div className="space-y-2">
            {scorerData.map(({ name, pts }) => {
              const maxPts = scorerData[0].pts
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="text-sm font-medium text-white w-24 shrink-0 truncate">{name}</div>
                  <div className="flex-1 progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((pts / maxPts) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-yellow-400 font-bold w-12 text-right shrink-0">+{pts}p</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {leaderboardData.length === 0 && (
        <div className="card text-center py-16 text-[rgba(255,255,255,0.3)]">
          <div className="text-4xl mb-3">📈</div>
          <p>Nu există date suficiente pentru statistici.</p>
        </div>
      )}
    </div>
  )
}
