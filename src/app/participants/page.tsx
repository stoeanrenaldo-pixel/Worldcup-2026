import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trophy, Target } from 'lucide-react'

export const revalidate = 300

export default async function ParticipantsPage() {
  const { data: entries } = await supabase
    .from('leaderboard_cache')
    .select('*, participant:participants(*)')
    .order('rank')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gold-gradient mb-1">Participanți</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm">
          {entries?.length || 0} participanți înscriși
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(entries || []).map(entry => {
          const p = (entry as any).participant
          return (
            <Link
              key={entry.participant_id}
              href={`/participants/${entry.participant_id}`}
              className="card-hover"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${entry.rank === 1 ? 'bg-yellow-500 text-black' :
                    entry.rank === 2 ? 'bg-gray-400 text-black' :
                    entry.rank === 3 ? 'bg-orange-600 text-white' :
                    'bg-[#242440] text-[rgba(255,255,255,0.5)]'}`}>
                  {entry.rank}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p?.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-[rgba(255,255,255,0.35)] flex items-center gap-1">
                      <Trophy size={9} /> {p?.winner_prediction || '—'}
                    </span>
                    <span className="text-[10px] text-[rgba(255,255,255,0.35)] flex items-center gap-1">
                      <Target size={9} /> {p?.golden_boot_prediction || '—'}
                    </span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <div className="font-bold text-yellow-400">{entry.total_points}</div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.3)]">puncte</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
