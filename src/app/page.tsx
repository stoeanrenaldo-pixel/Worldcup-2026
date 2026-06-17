import { getLeaderboard } from '@/lib/supabase'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

export const revalidate = 60 // Revalidate every minute

export default async function Home() {
  const leaderboard = await getLeaderboard()

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-gold-gradient mb-2">
          Clasament General
        </h1>
        <p className="text-[rgba(255,255,255,0.5)] text-sm">
          {leaderboard.entries.length} participanți • actualizat automat
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Participanți', value: leaderboard.entries.length, icon: '👥' },
          { label: 'Zile de meciuri', value: leaderboard.totalMatchdays, icon: '📅' },
          {
            label: 'Lider',
            value: leaderboard.entries[0]?.participant?.name?.split(' ')[0] || '-',
            icon: '🥇',
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-lg font-bold text-yellow-400">{value}</div>
            <div className="text-xs text-[rgba(255,255,255,0.4)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <LeaderboardTable
        entries={leaderboard.entries}
        matchdays={leaderboard.matchdays}
      />

      <p className="text-center text-xs text-[rgba(255,255,255,0.3)] mt-6">
        Clasamentul se actualizează automat după fiecare meci calculat
      </p>
    </div>
  )
}
