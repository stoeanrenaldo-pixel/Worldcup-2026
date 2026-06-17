'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TEAM_FLAGS: Record<string, string> = {
  'Portugalia': '🇵🇹', 'Portugal': '🇵🇹',
  'Anglia': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Franta': '🇫🇷', 'France': '🇫🇷',
  'Spania': '🇪🇸', 'Spain': '🇪🇸',
  'Germania': '🇩🇪', 'Germany': '🇩🇪',
  'Brazilia': '🇧🇷', 'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Uruguay': '🇺🇾',
  'Columbia': '🇨🇴', 'Colombia': '🇨🇴',
  'Mexic': '🇲🇽', 'Mexico': '🇲🇽',
  'SUA': '🇺🇸', 'USA': '🇺🇸',
  'Canada': '🇨🇦',
  'Olanda': '🇳🇱', 'Netherlands': '🇳🇱',
  'Belgia': '🇧🇪', 'Belgium': '🇧🇪',
  'Italia': '🇮🇹', 'Italy': '🇮🇹',
  'Croatia': '🇭🇷',
  'Senegal': '🇸🇳',
  'Maroc': '🇲🇦', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Camerun': '🇨🇲', 'Cameroon': '🇨🇲',
  'Japonia': '🇯🇵', 'Japan': '🇯🇵',
  'Coreea de Sud': '🇰🇷', 'South Korea': '🇰🇷',
  'Iran': '🇮🇷',
  'Arabia Saudita': '🇸🇦', 'Saudi Arabia': '🇸🇦',
  'Australia': '🇦🇺',
  'RD Congo': '🇨🇩', 'DR Congo': '🇨🇩',
  'Panama': '🇵🇦',
  'Uzbekistan': '🇺🇿',
  'Ghana': '🇬🇭',
  'Danemarca': '🇩🇰', 'Denmark': '🇩🇰',
  'Polonia': '🇵🇱', 'Poland': '🇵🇱',
  'Elvetia': '🇨🇭', 'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Turcia': '🇹🇷', 'Turkey': '🇹🇷',
  'Serbia': '🇷🇸',
  'Romania': '🇷🇴',
}

interface MatchRow {
  home_team: string
  away_team: string
  group_name: string
  kickoff_time: string
}

export default function AdminMatchdayPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [label, setLabel] = useState('')
  const [matches, setMatches] = useState<MatchRow[]>([
    { home_team: '', away_team: '', group_name: '', kickoff_time: '' }
  ])
  const [saving, setSaving] = useState(false)

  const addMatch = () => {
    setMatches(prev => [...prev, { home_team: '', away_team: '', group_name: '', kickoff_time: '' }])
  }

  const removeMatch = (idx: number) => {
    setMatches(prev => prev.filter((_, i) => i !== idx))
  }

  const updateMatch = (idx: number, field: keyof MatchRow, value: string) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  const getFlag = (team: string) => {
    return TEAM_FLAGS[team] || '🏳️'
  }

  const handleSave = async () => {
    if (!date) return toast.error('Selectează data')
    const validMatches = matches.filter(m => m.home_team && m.away_team)
    if (!validMatches.length) return toast.error('Adaugă cel puțin un meci')

    setSaving(true)
    try {
      const res = await fetch('/api/admin/matchday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': document.cookie.match(/admin_token=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify({
          date,
          label: label || `Ziua ${date}`,
          matches: validMatches.map(m => ({
            home_team: m.home_team,
            away_team: m.away_team,
            home_team_flag: getFlag(m.home_team),
            away_team_flag: getFlag(m.away_team),
            group_name: m.group_name,
            kickoff_at: m.kickoff_time ? `${date}T${m.kickoff_time}:00Z` : null,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Eroare')
      }

      const data = await res.json()
      toast.success(`Zi de joc creată! ${validMatches.length} meciuri adăugate.`)
      router.push('/admin/import?matchday=' + data.matchday.id)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Creare zi de joc</h1>
        <p className="text-sm text-[rgba(255,255,255,0.4)]">Adaugă meciurile pentru o zi</p>
      </div>

      {/* Date & label */}
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">Data *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="admin-input"
            />
          </div>
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1.5">Etichetă (opțional)</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="admin-input"
              placeholder="ex: Ziua 7, Optimi"
            />
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.7)]">Meciuri</h2>
          <button onClick={addMatch} className="admin-btn-secondary text-xs py-1.5">
            <Plus size={14} /> Adaugă meci
          </button>
        </div>

        {matches.map((match, idx) => (
          <div key={idx} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[rgba(255,255,255,0.4)]">Meci {idx + 1}</span>
              {matches.length > 1 && (
                <button
                  onClick={() => removeMatch(idx)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[rgba(255,255,255,0.4)] mb-1">
                  {getFlag(match.home_team)} Echipa acasă *
                </label>
                <input
                  type="text"
                  value={match.home_team}
                  onChange={e => updateMatch(idx, 'home_team', e.target.value)}
                  className="admin-input text-sm"
                  placeholder="ex: Portugalia"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[rgba(255,255,255,0.4)] mb-1">
                  {getFlag(match.away_team)} Echipa deplasare *
                </label>
                <input
                  type="text"
                  value={match.away_team}
                  onChange={e => updateMatch(idx, 'away_team', e.target.value)}
                  className="admin-input text-sm"
                  placeholder="ex: RD Congo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[rgba(255,255,255,0.4)] mb-1">Grupă</label>
                <input
                  type="text"
                  value={match.group_name}
                  onChange={e => updateMatch(idx, 'group_name', e.target.value)}
                  className="admin-input text-sm"
                  placeholder="ex: Grupa K"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[rgba(255,255,255,0.4)] mb-1">Ora (UTC)</label>
                <input
                  type="time"
                  value={match.kickoff_time}
                  onChange={e => updateMatch(idx, 'kickoff_time', e.target.value)}
                  className="admin-input text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="admin-btn-primary w-full justify-center py-3"
      >
        <Save size={16} />
        {saving ? 'Se salvează...' : `Salvează (${matches.filter(m => m.home_team && m.away_team).length} meciuri)`}
      </button>
    </div>
  )
}
