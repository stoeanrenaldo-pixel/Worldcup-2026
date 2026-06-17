'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Calculator, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Matchday, Match } from '@/types'
import { clsx } from 'clsx'
import { useSearchParams } from 'next/navigation'

interface GoalscorerRow { player_name: string; goals: number; is_own_goal: boolean }
interface EventRow { event_type: 'missed_penalty' | 'red_card'; player_name: string }

export default function AdminResultsPage() {
  const searchParams = useSearchParams()
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [selectedMatchday, setSelectedMatchday] = useState(searchParams.get('matchday') || '')
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [goalscorers, setGoalscorers] = useState<GoalscorerRow[]>([{ player_name: '', goals: 1, is_own_goal: false }])
  const [events, setEvents] = useState<EventRow[]>([])
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [savedMatches, setSavedMatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('matchdays').select('*').order('match_date', { ascending: false })
      .then(({ data }) => setMatchdays(data || []))
  }, [])

  useEffect(() => {
    if (!selectedMatchday) return
    supabase.from('matches').select('*').eq('matchday_id', selectedMatchday).order('kickoff_at')
      .then(({ data }) => {
        setMatches(data || [])
        // Pre-mark matches that already have results
        const alreadySaved = new Set((data || []).filter(m => m.home_score !== null).map(m => m.id))
        setSavedMatches(alreadySaved)
      })
  }, [selectedMatchday])

  useEffect(() => {
    if (!selectedMatch) return
    const match = matches.find(m => m.id === selectedMatch)
    if (match?.home_score !== null) {
      setHomeScore(String(match!.home_score))
      setAwayScore(String(match!.away_score))
    } else {
      setHomeScore('')
      setAwayScore('')
      setGoalscorers([{ player_name: '', goals: 1, is_own_goal: false }])
      setEvents([])
    }
    // Load existing goalscorers
    Promise.all([
      supabase.from('match_goalscorers').select('*').eq('match_id', selectedMatch),
      supabase.from('match_events').select('*').eq('match_id', selectedMatch),
    ]).then(([gs, ev]) => {
      if (gs.data?.length) {
        setGoalscorers(gs.data.map(g => ({ player_name: g.player_name, goals: g.goals, is_own_goal: g.is_own_goal })))
      }
      if (ev.data?.length) {
        setEvents(ev.data.map(e => ({ event_type: e.event_type, player_name: e.player_name })))
      }
    })
  }, [selectedMatch, matches])

  const handleSaveResult = async () => {
    if (!selectedMatch) return toast.error('Selectează meciul')
    if (homeScore === '' || awayScore === '') return toast.error('Introdu scorul')

    setSaving(true)
    try {
      const token = document.cookie.match(/admin_token=([^;]+)/)?.[1] || ''
      const res = await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({
          matchId: selectedMatch,
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
          goalscorers: goalscorers.filter(g => g.player_name.trim()),
          events: events.filter(e => e.player_name.trim()),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Rezultat salvat!')
      setSavedMatches(prev => new Set([...prev, selectedMatch]))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCalculate = async () => {
    if (!selectedMatch) return toast.error('Selectează meciul')
    setCalculating(true)
    try {
      const token = document.cookie.match(/admin_token=([^;]+)/)?.[1] || ''
      const res = await fetch('/api/admin/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ matchId: selectedMatch }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      toast.success(`✅ ${data.updated} pronosticuri calculate! Clasamentul a fost actualizat.`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCalculating(false)
    }
  }

  const selectedMatchData = matches.find(m => m.id === selectedMatch)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Introduire rezultate</h1>
        <p className="text-sm text-[rgba(255,255,255,0.4)]">Setează scorul final și marcatorii</p>
      </div>

      {/* Matchday selection */}
      <div className="card space-y-3">
        <label className="text-xs text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Zi de joc</label>
        <select value={selectedMatchday} onChange={e => setSelectedMatchday(e.target.value)} className="admin-input">
          <option value="">-- Selectează --</option>
          {matchdays.map(md => (
            <option key={md.id} value={md.id}>{md.match_date} {md.label ? `— ${md.label}` : ''}</option>
          ))}
        </select>

        {/* Match list */}
        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border',
                  selectedMatch === m.id
                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                    : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,215,0,0.2)] text-[rgba(255,255,255,0.7)]'
                )}
              >
                <span>{m.home_team_flag} {m.home_team}</span>
                <span className="text-[rgba(255,255,255,0.3)]">—</span>
                <span>{m.away_team} {m.away_team_flag}</span>
                {savedMatches.has(m.id) && (
                  <CheckCircle size={14} className="ml-auto text-emerald-400" />
                )}
                {m.home_score !== null && !savedMatches.has(m.id) && (
                  <span className="ml-auto text-xs text-emerald-400 font-mono">
                    {m.home_score}–{m.away_score}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result entry */}
      {selectedMatch && (
        <>
          <div className="card space-y-4">
            <div className="text-sm font-semibold text-[rgba(255,255,255,0.7)]">
              {selectedMatchData?.home_team_flag} {selectedMatchData?.home_team} — {selectedMatchData?.away_team} {selectedMatchData?.away_team_flag}
            </div>

            {/* Score */}
            <div>
              <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-2">Scor final *</label>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" max="20"
                  value={homeScore}
                  onChange={e => setHomeScore(e.target.value)}
                  className="admin-input text-center text-2xl font-bold w-20"
                  placeholder="0"
                />
                <span className="text-2xl text-[rgba(255,255,255,0.3)] font-bold">–</span>
                <input
                  type="number" min="0" max="20"
                  value={awayScore}
                  onChange={e => setAwayScore(e.target.value)}
                  className="admin-input text-center text-2xl font-bold w-20"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Goalscorers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[rgba(255,255,255,0.5)]">Marcatori</label>
                <button
                  onClick={() => setGoalscorers(prev => [...prev, { player_name: '', goals: 1, is_own_goal: false }])}
                  className="text-xs text-yellow-400 flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> Adaugă
                </button>
              </div>
              <div className="space-y-2">
                {goalscorers.map((gs, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={gs.player_name}
                      onChange={e => setGoalscorers(prev => prev.map((g, i) => i === idx ? { ...g, player_name: e.target.value } : g))}
                      className="admin-input flex-1 text-sm"
                      placeholder="Nume jucător"
                    />
                    <input
                      type="number" min="1" max="5"
                      value={gs.goals}
                      onChange={e => setGoalscorers(prev => prev.map((g, i) => i === idx ? { ...g, goals: parseInt(e.target.value) || 1 } : g))}
                      className="admin-input w-16 text-center text-sm"
                    />
                    <label className="flex items-center gap-1 text-xs text-[rgba(255,255,255,0.5)] whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gs.is_own_goal}
                        onChange={e => setGoalscorers(prev => prev.map((g, i) => i === idx ? { ...g, is_own_goal: e.target.checked } : g))}
                        className="accent-red-500"
                      />
                      Autogol
                    </label>
                    <button onClick={() => setGoalscorers(prev => prev.filter((_, i) => i !== idx))} className="text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[rgba(255,255,255,0.5)]">Evenimente negative</label>
                <button
                  onClick={() => setEvents(prev => [...prev, { event_type: 'missed_penalty', player_name: '' }])}
                  className="text-xs text-red-400 flex items-center gap-1 hover:underline"
                >
                  <Plus size={12} /> Adaugă
                </button>
              </div>
              <div className="space-y-2">
                {events.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={ev.event_type}
                      onChange={e => setEvents(prev => prev.map((ev2, i) => i === idx ? { ...ev2, event_type: e.target.value as any } : ev2))}
                      className="admin-input text-sm w-44"
                    >
                      <option value="missed_penalty">Penalty ratat</option>
                      <option value="red_card">Eliminare</option>
                    </select>
                    <input
                      type="text"
                      value={ev.player_name}
                      onChange={e => setEvents(prev => prev.map((ev2, i) => i === idx ? { ...ev2, player_name: e.target.value } : ev2))}
                      className="admin-input flex-1 text-sm"
                      placeholder="Jucător"
                    />
                    <button onClick={() => setEvents(prev => prev.filter((_, i) => i !== idx))} className="text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(255,215,0,0.08)]">
              <button onClick={handleSaveResult} disabled={saving} className="admin-btn-secondary justify-center py-3">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? 'Se salvează...' : 'Salvează rezultat'}
              </button>
              <button
                onClick={handleCalculate}
                disabled={calculating || !savedMatches.has(selectedMatch)}
                className="admin-btn-primary justify-center py-3"
              >
                {calculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                {calculating ? 'Calculează...' : 'Calculează puncte'}
              </button>
            </div>

            {!savedMatches.has(selectedMatch) && (
              <p className="text-xs text-[rgba(255,255,255,0.3)] text-center">
                Salvează mai întâi rezultatul, apoi calculează punctele.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
