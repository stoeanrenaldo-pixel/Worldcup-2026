'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeaderboardEntry, Matchday, Participant } from '@/types'

interface Props {
  entries: (LeaderboardEntry & { participant: Participant })[]
  matchdays: Matchday[]
}

function getPtsClass(pts: number | undefined) {
  if (pts === undefined || pts === 0) return 'pts-zero'
  if (pts >= 10) return 'pts-excellent'
  if (pts >= 5) return 'pts-good'
  if (pts < 0) return 'pts-negative'
  return ''
}

function RankIndicator({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null || prev === current) return <Minus size={12} className="text-gray-600" />
  if (current < prev) return <TrendingUp size={12} className="text-emerald-400" />
  return <TrendingDown size={12} className="text-red-400" />
}

const DAYS_PER_PAGE = 8

export function LeaderboardTable({ entries, matchdays }: Props) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  // Paginate matchday columns
  const totalPages = Math.ceil(matchdays.length / DAYS_PER_PAGE)
  const visibleMatchdays = matchdays.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE)

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(e => e.participant?.name.toLowerCase().includes(q))
  }, [entries, search])

  return (
    <div className="card p-0 overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-[rgba(255,215,0,0.08)]">
        <input
          type="search"
          placeholder="Caută participant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-input text-sm"
        />
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="leaderboard-table">
          <thead>
            <tr className="bg-[#0f0f1a]">
              <th className="text-left pl-4 w-10 sticky left-0 bg-[#0f0f1a] z-10">#</th>
              <th className="text-left sticky left-10 bg-[#0f0f1a] z-10 min-w-[160px]">Participant</th>
              <th className="text-right pr-4 font-bold text-yellow-400">Total</th>

              {/* Matchday columns with pagination */}
              {visibleMatchdays.map(md => (
                <th key={md.id} className="text-center min-w-[52px]">
                  <div className="text-[10px] text-[rgba(255,255,255,0.3)]">
                    {format(new Date(md.match_date + 'T12:00:00'), 'dd/MM')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, idx) => {
              const isTop3 = entry.rank <= 3
              return (
                <tr
                  key={entry.participant_id}
                  className={clsx(
                    'transition-colors',
                    isTop3 && entry.rank === 1 && 'bg-yellow-900/10',
                    isTop3 && entry.rank === 2 && 'bg-gray-700/10',
                    isTop3 && entry.rank === 3 && 'bg-orange-900/10',
                  )}
                >
                  {/* Rank */}
                  <td className="pl-4 sticky left-0 bg-[#12121f] z-10">
                    <div className="flex items-center gap-1">
                      <span className={clsx(
                        'font-bold text-sm',
                        entry.rank === 1 && 'text-yellow-400',
                        entry.rank === 2 && 'text-gray-300',
                        entry.rank === 3 && 'text-orange-400',
                        entry.rank > 3 && 'text-[rgba(255,255,255,0.5)]'
                      )}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                      </span>
                      <RankIndicator current={entry.rank} prev={entry.prev_rank} />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="sticky left-10 bg-[#12121f] z-10">
                    <Link
                      href={`/participants/${entry.participant_id}`}
                      className="font-medium text-white hover:text-yellow-400 transition-colors block truncate max-w-[155px]"
                    >
                      {entry.participant?.name}
                    </Link>
                    <div className="text-[10px] text-[rgba(255,255,255,0.35)]">
                      {entry.matches_exact}✓ din {entry.matches_predicted}
                    </div>
                  </td>

                  {/* Total points */}
                  <td className="text-right pr-4">
                    <span className="font-bold text-yellow-400 text-base">
                      {entry.total_points}
                    </span>
                  </td>

                  {/* Points per matchday */}
                  {visibleMatchdays.map(md => {
                    const pts = entry.pts_by_matchday?.[md.match_date]
                    return (
                      <td key={md.id} className="text-center">
                        <span className={clsx(
                          'inline-block w-9 h-7 leading-7 text-center text-xs font-medium rounded',
                          getPtsClass(pts)
                        )}>
                          {pts !== undefined ? pts : ''}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          <tfoot>
            <tr className="bg-[#0f0f1a] border-t border-[rgba(255,215,0,0.15)]">
              <td className="pl-4 sticky left-0 bg-[#0f0f1a] z-10" />
              <td className="sticky left-10 bg-[#0f0f1a] z-10 text-xs font-medium text-[rgba(255,255,255,0.5)] py-2">
                Total puncte
              </td>
              <td className="text-right pr-4 font-bold text-yellow-500 text-sm">
                {entries.reduce((s, e) => s + e.total_points, 0)}
              </td>
              {visibleMatchdays.map(md => {
                const dayTotal = entries.reduce((s, e) => s + (e.pts_by_matchday?.[md.match_date] || 0), 0)
                return (
                  <td key={md.id} className="text-center text-xs font-bold text-[rgba(255,255,255,0.5)]">
                    {dayTotal || ''}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,215,0,0.08)]">
          <span className="text-xs text-[rgba(255,255,255,0.4)]">
            Zile {page * DAYS_PER_PAGE + 1}–{Math.min((page + 1) * DAYS_PER_PAGE, matchdays.length)} din {matchdays.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-[rgba(255,215,0,0.15)] disabled:opacity-30 hover:border-[rgba(255,215,0,0.3)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium">{page + 1}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-[rgba(255,215,0,0.15)] disabled:opacity-30 hover:border-[rgba(255,215,0,0.3)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-[rgba(255,215,0,0.05)] flex items-center gap-4 flex-wrap">
        <span className="text-[10px] text-[rgba(255,255,255,0.3)]">Legendă:</span>
        {[
          { cls: 'pts-excellent', label: '10+' },
          { cls: 'pts-good', label: '5–9' },
          { cls: 'pts-negative', label: 'negativ' },
        ].map(({ cls, label }) => (
          <span key={label} className={clsx('text-[10px] px-2 py-0.5 rounded', cls)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
