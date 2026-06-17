'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Upload, CheckCircle, AlertCircle, Loader2, Wand2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Matchday, Match, ParsedPrediction, ImportParseResult } from '@/types'
import { clsx } from 'clsx'
import { useSearchParams } from 'next/navigation'

export default function AdminImportPage() {
  const searchParams = useSearchParams()
  const preselectedMatchday = searchParams.get('matchday')

  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [selectedMatchday, setSelectedMatchday] = useState<string>(preselectedMatchday || '')
  const [matches, setMatches] = useState<Match[]>([])
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ImportParseResult | null>(null)
  const [confirmedPredictions, setConfirmedPredictions] = useState<ParsedPrediction[]>([])

  useEffect(() => {
    supabase.from('matchdays').select('*').order('match_date', { ascending: false })
      .then(({ data }) => setMatchdays(data || []))
  }, [])

  useEffect(() => {
    if (!selectedMatchday) return
    supabase.from('matches').select('*').eq('matchday_id', selectedMatchday).order('kickoff_at')
      .then(({ data }) => setMatches(data || []))
  }, [selectedMatchday])

  const handleParse = async () => {
    if (!rawText.trim()) return toast.error('Lipește comentariile din Facebook')
    if (!selectedMatchday) return toast.error('Selectează ziua de joc')
    if (!matches.length) return toast.error('Nu există meciuri pentru această zi')

    setParsing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': document.cookie.match(/admin_token=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify({ matchdayId: selectedMatchday, rawText }),
      })
      if (!res.ok) throw new Error('Eroare la parsare')
      const data: ImportParseResult = await res.json()
      setResult(data)
      setConfirmedPredictions(data.parsed)
      if (data.parsed.length > 0) {
        toast.success(`${data.parsed.length} pronosticuri detectate!`)
      } else {
        toast.warning('Nu s-au detectat pronosticuri')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setParsing(false)
    }
  }

  const togglePrediction = (idx: number) => {
    const pred = result!.parsed[idx]
    setConfirmedPredictions(prev =>
      prev.find(p => p === pred)
        ? prev.filter(p => p !== pred)
        : [...prev, pred]
    )
  }

  const handleSave = async () => {
    if (!confirmedPredictions.length) return toast.error('Niciun pronostic de salvat')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/save-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': document.cookie.match(/admin_token=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify({ matchdayId: selectedMatchday, predictions: confirmedPredictions }),
      })
      if (!res.ok) throw new Error('Eroare la salvare')
      const data = await res.json()
      toast.success(`${data.saved} pronosticuri salvate!`)
      setResult(null)
      setRawText('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Import Facebook</h1>
        <p className="text-sm text-[rgba(255,255,255,0.4)]">
          Lipește comentariile din grupul de Facebook și AI-ul va detecta pronosticurile automat
        </p>
      </div>

      {/* Step 1: Select matchday */}
      <div className="card space-y-3">
        <label className="text-xs text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
          1. Selectează ziua de joc
        </label>
        <select
          value={selectedMatchday}
          onChange={e => setSelectedMatchday(e.target.value)}
          className="admin-input"
        >
          <option value="">-- Selectează --</option>
          {matchdays.map(md => (
            <option key={md.id} value={md.id}>
              {md.match_date} {md.label ? `— ${md.label}` : ''}
            </option>
          ))}
        </select>
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matches.map(m => (
              <span key={m.id} className="text-xs bg-[#0f0f1a] border border-[rgba(255,215,0,0.1)] rounded-lg px-2 py-1 text-[rgba(255,255,255,0.6)]">
                {m.home_team_flag} {m.home_team} — {m.away_team} {m.away_team_flag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Paste comments */}
      <div className="card space-y-3">
        <label className="text-xs text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
          2. Lipește comentariile din Facebook
        </label>
        <textarea
          className="facebook-import-textarea"
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Renaldo Stoean\nPortugalia - RD Congo 3-0 Ronaldo\nAnglia - Croatia 2-1 Kane\n\nBogdan Dumitriu\nPortugalia - RD Congo 2-0 Mbappe\nAnglia - Croatia 1-0 Kane`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[rgba(255,255,255,0.3)]">
            {rawText.split('\n').filter(l => l.trim()).length} linii
          </span>
          <button
            onClick={() => setRawText('')}
            className="text-xs text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
          >
            Șterge
          </button>
        </div>
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={parsing || !rawText.trim() || !selectedMatchday}
        className="admin-btn-primary w-full justify-center py-3"
      >
        {parsing ? (
          <><Loader2 size={16} className="animate-spin" /> AI parsează comentariile...</>
        ) : (
          <><Wand2 size={16} /> Detectează pronosticuri cu AI</>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Detectate', value: result.parsed.length, color: 'text-emerald-400', icon: '✅' },
              { label: 'Confirmate', value: confirmedPredictions.length, color: 'text-yellow-400', icon: '☑️' },
              { label: 'Nerecunoscute', value: result.unmatched.length, color: 'text-orange-400', icon: '⚠️' },
              { label: 'Participanți lipsă', value: result.participantNotFound.length, color: 'text-red-400', icon: '❓' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="card text-center py-3">
                <div className="text-lg mb-0.5">{icon}</div>
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-[rgba(255,255,255,0.4)]">{label}</div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {result.participantNotFound.length > 0 && (
            <div className="card border-orange-800/30 bg-orange-900/10">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-orange-400 mb-1">Participanți nerecunoscuți</div>
                  <div className="text-xs text-[rgba(255,255,255,0.5)]">
                    {result.participantNotFound.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Parsed predictions list */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 bg-[#0f0f1a] border-b border-[rgba(255,215,0,0.08)] flex items-center justify-between">
              <span className="text-sm font-semibold">Pronosticuri detectate</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmedPredictions(result.parsed)}
                  className="text-xs text-yellow-400 hover:underline"
                >
                  Selectează toate
                </button>
                <span className="text-[rgba(255,255,255,0.2)]">|</span>
                <button
                  onClick={() => setConfirmedPredictions([])}
                  className="text-xs text-[rgba(255,255,255,0.4)] hover:underline"
                >
                  Deselectează
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)]">
              {result.parsed.map((pred, idx) => {
                const isSelected = confirmedPredictions.includes(pred)
                return (
                  <label
                    key={idx}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                      isSelected ? 'bg-emerald-900/10' : 'hover:bg-[rgba(255,255,255,0.02)]'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePrediction(idx)}
                      className="accent-yellow-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{pred.participantName}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.5)]">
                        {pred.homeTeam} — {pred.awayTeam}
                        {pred.goalscorer && ` • ⚽ ${pred.goalscorer}`}
                      </div>
                    </div>
                    <div className="score-badge shrink-0">
                      {pred.homeScore}–{pred.awayScore}
                    </div>
                    <span className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                      pred.confidence === 'high' ? 'bg-emerald-900/30 text-emerald-400' :
                      pred.confidence === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-orange-900/30 text-orange-400'
                    )}>
                      {pred.confidence}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Unmatched lines */}
          {result.unmatched.length > 0 && (
            <div className="card border-[rgba(255,100,0,0.1)]">
              <div className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-2">
                ⚠️ Linii nerecunoscute ({result.unmatched.length})
              </div>
              <div className="space-y-1">
                {result.unmatched.slice(0, 10).map((line, i) => (
                  <div key={i} className="text-xs text-[rgba(255,255,255,0.35)] font-mono bg-[#0f0f1a] rounded px-2 py-1">
                    {line}
                  </div>
                ))}
                {result.unmatched.length > 10 && (
                  <div className="text-xs text-[rgba(255,255,255,0.3)]">
                    ...și alte {result.unmatched.length - 10}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || confirmedPredictions.length === 0}
            className="admin-btn-primary w-full justify-center py-3"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Se salvează...</>
            ) : (
              <><Save size={16} /> Salvează {confirmedPredictions.length} pronosticuri</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
