'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Upload, CheckSquare, Users, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    participants: 0,
    matchdays: 0,
    matches: 0,
    predicted: 0,
    calculated: 0,
    pending: 0,
  })
  const [recentMatchdays, setRecentMatchdays] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [
        { count: participants },
        { count: matchdays },
        { count: matches },
        { count: predicted },
        { count: calculated },
        { data: recent },
      ] = await Promise.all([
        supabase.from('participants').select('*', { count: 'exact', head: true }),
        supabase.from('matchdays').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('is_calculated', true),
        supabase.from('matchdays').select('*, matches(count)').order('match_date', { ascending: false }).limit(5),
      ])
      setStats({
        participants: participants || 0,
        matchdays: matchdays || 0,
        matches: matches || 0,
        predicted: predicted || 0,
        calculated: calculated || 0,
        pending: (predicted || 0) - (calculated || 0),
      })
      setRecentMatchdays(recent || [])
    }
    load()
  }, [])

  const QUICK_ACTIONS = [
    { href: '/admin/matchday', label: 'Zi de joc nouă', desc: 'Adaugă meciuri pentru o zi', icon: Calendar, color: 'text-blue-400' },
    { href: '/admin/import', label: 'Import Facebook', desc: 'Importă pronosticuri din comentarii', icon: Upload, color: 'text-purple-400' },
    { href: '/admin/results', label: 'Introduce rezultate', desc: 'Setează scoruri și marcatori', icon: CheckSquare, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gold-gradient">Dashboard Admin</h1>
        <p className="text-sm text-[rgba(255,255,255,0.4)]">CM 2026 — Panoul de control</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Participanți', value: stats.participants, icon: '👥' },
          { label: 'Zile de joc', value: stats.matchdays, icon: '📅' },
          { label: 'Meciuri total', value: stats.matches, icon: '⚽' },
          { label: 'Pronosticuri', value: stats.predicted, icon: '📝' },
          { label: 'Calculate', value: stats.calculated, icon: '✅' },
          { label: 'În așteptare', value: stats.pending, icon: '⏳' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card text-center py-4">
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-yellow-400">{value}</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3">
          Acțiuni rapide
        </h2>
        <div className="space-y-2">
          {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 card-hover py-4"
            >
              <div className={`w-10 h-10 rounded-xl bg-[#0f0f1a] flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-[rgba(255,255,255,0.4)]">{desc}</div>
              </div>
              <ChevronRight size={16} className="text-[rgba(255,255,255,0.3)]" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent matchdays */}
      {recentMatchdays.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3">
            Zile de joc recente
          </h2>
          <div className="card p-0 divide-y divide-[rgba(255,255,255,0.04)]">
            {recentMatchdays.map(md => (
              <Link
                key={md.id}
                href={`/admin/results?matchday=${md.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,215,0,0.03)] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{md.label || md.match_date}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.4)]">
                    {md.matches?.[0]?.count || 0} meciuri
                  </div>
                </div>
                <ChevronRight size={14} className="text-[rgba(255,255,255,0.3)]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
