// =============================================================
// AI-POWERED FACEBOOK COMMENT PARSER
// Uses Claude claude-sonnet-4-6 to intelligently parse predictions
// =============================================================

import Fuse from 'fuse.js'
import type { Match, Participant, ParsedPrediction, ImportParseResult, AIParsedBlock } from '@/types'

// ---------------------------------------------------------------
// FUZZY MATCHER for team names
// ---------------------------------------------------------------
export function buildTeamMatcher(matches: Match[]) {
  const teamEntries: { name: string; matchId: string; side: 'home' | 'away' }[] = []
  
  for (const match of matches) {
    teamEntries.push({ name: match.home_team.toLowerCase(), matchId: match.id, side: 'home' })
    teamEntries.push({ name: match.away_team.toLowerCase(), matchId: match.id, side: 'away' })
    for (const alias of match.home_team_aliases) {
      teamEntries.push({ name: alias.toLowerCase(), matchId: match.id, side: 'home' })
    }
    for (const alias of match.away_team_aliases) {
      teamEntries.push({ name: alias.toLowerCase(), matchId: match.id, side: 'away' })
    }
  }
  
  return new Fuse(teamEntries, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  })
}

// ---------------------------------------------------------------
// FUZZY MATCHER for participant names
// ---------------------------------------------------------------
export function buildParticipantMatcher(participants: Participant[]) {
  const entries: { name: string; id: string }[] = []
  
  for (const p of participants) {
    entries.push({ name: p.name, id: p.id })
    for (const alias of p.name_aliases) {
      entries.push({ name: alias, id: p.id })
    }
  }
  
  return new Fuse(entries, {
    keys: ['name'],
    threshold: 0.35,
    includeScore: true,
  })
}

// ---------------------------------------------------------------
// REGEX-BASED FALLBACK PARSER
// Handles most common formats:
//   Portugal - DR Congo 3-0 Ronaldo
//   Portugal 3-0 Ronaldo
//   POR 3:0 RDC Ronaldo
//   Portugal vs Congo 3-0 CR7
// ---------------------------------------------------------------
const SCORE_PATTERN = /(\d+)\s*[-:x]\s*(\d+)/
const TEAM_VS_PATTERN = /^(.+?)\s+(?:vs?\.?\s+|[-–]\s*)(.+?)\s+(\d+)\s*[-:x]\s*(\d+)\s*(.*)$/i
const TEAM_SCORE_SCORER = /^(.+?)\s+(\d+)\s*[-:x]\s*(\d+)\s*(.*)$/i

export function parseLineRegex(
  line: string,
  matches: Match[],
  teamFuse: ReturnType<typeof buildTeamMatcher>
): Omit<ParsedPrediction, 'participantName'> | null {
  const trimmed = line.trim()
  if (!trimmed || !SCORE_PATTERN.test(trimmed)) return null

  let homeTeam = '', awayTeam = '', homeScore = 0, awayScore = 0, rest = ''

  // Try "Team vs Team Score [Scorer]"
  const vsMatch = trimmed.match(TEAM_VS_PATTERN)
  if (vsMatch) {
    homeTeam = vsMatch[1].trim()
    awayTeam = vsMatch[2].trim()
    homeScore = parseInt(vsMatch[3])
    awayScore = parseInt(vsMatch[4])
    rest = vsMatch[5]?.trim() || ''
  } else {
    // Try "Team Score [Scorer]" (away team omitted)
    const simpleMatch = trimmed.match(TEAM_SCORE_SCORER)
    if (simpleMatch) {
      homeTeam = simpleMatch[1].trim()
      homeScore = parseInt(simpleMatch[2])
      awayScore = parseInt(simpleMatch[3])
      rest = simpleMatch[4]?.trim() || ''
    } else {
      return null
    }
  }

  // Fuzzy-match home team to find the match
  const homeResults = teamFuse.search(homeTeam)
  if (!homeResults.length) return null
  
  const bestHome = homeResults[0]
  const matchId = bestHome.item.matchId
  const foundMatch = matches.find(m => m.id === matchId)
  if (!foundMatch) return null

  // Extract goalscorer (rest after score)
  const goalscorer = rest.length > 1 ? rest.split(/\s+/)[0] || null : null

  return {
    matchId,
    homeTeam: foundMatch.home_team,
    awayTeam: foundMatch.away_team,
    homeScore,
    awayScore,
    goalscorer: goalscorer || null,
    rawLine: line,
    confidence: vsMatch ? 'high' : 'medium',
    issues: [],
  }
}

// ---------------------------------------------------------------
// AI PARSER — sends raw text to Claude for intelligent parsing
// ---------------------------------------------------------------
export async function parseWithAI(
  rawText: string,
  matches: Match[]
): Promise<AIParsedBlock[]> {
  const matchList = matches
    .map(m => `- ${m.home_team} vs ${m.away_team} (aliases: ${[...m.home_team_aliases, ...m.away_team_aliases].join(', ')})`)
    .join('\n')

  const systemPrompt = `You are a parser for a Romanian FIFA World Cup prediction contest.
Extract predictions from Facebook comment threads.

TODAY'S MATCHES:
${matchList}

RULES:
- Each comment starts with a participant name (full name, may span one line)
- Each prediction line has: [Team1] [optional: vs/- Team2] [Score like 3-0 or 3:0] [optional: Goalscorer]
- Scores can be written as: 3-0, 3:0, 3 - 0
- Team names may be abbreviated (POR = Portugal, ENG = England, etc.)
- Goalscorer may be a nickname (CR7 = Ronaldo, Neymar = Neymar Jr)
- Some participants may not predict all matches

Return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "participantName": "Full Name",
    "predictions": [
      {
        "homeTeam": "exact team name from list",
        "awayTeam": "exact team name from list",
        "homeScore": 3,
        "awayScore": 0,
        "goalscorer": "Ronaldo or null"
      }
    ]
  }
]`

  const response = await fetch('/api/ai-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, systemPrompt }),
  })

  if (!response.ok) throw new Error('AI parse failed')
  const data = await response.json()
  return data.result as AIParsedBlock[]
}

// ---------------------------------------------------------------
// MAIN ORCHESTRATOR: parse Facebook comments
// Tries AI first, falls back to regex per line
// ---------------------------------------------------------------
export async function parseFacebookComments(
  rawText: string,
  matches: Match[],
  participants: Participant[],
  useAI: boolean = true
): Promise<ImportParseResult> {
  const participantFuse = buildParticipantMatcher(participants)
  const teamFuse = buildTeamMatcher(matches)
  
  const parsed: ParsedPrediction[] = []
  const unmatched: string[] = []
  const participantNotFound: string[] = []
  const matchNotFound: string[] = []

  let aiBlocks: AIParsedBlock[] = []
  
  if (useAI) {
    try {
      aiBlocks = await parseWithAI(rawText, matches)
    } catch (e) {
      console.warn('AI parsing failed, falling back to regex', e)
    }
  }

  if (aiBlocks.length > 0) {
    // Process AI results
    for (const block of aiBlocks) {
      // Find participant
      const pResults = participantFuse.search(block.participantName)
      if (!pResults.length) {
        participantNotFound.push(block.participantName)
        continue
      }
      const participantId = pResults[0].item.id
      const participant = participants.find(p => p.id === participantId)!

      for (const pred of block.predictions) {
        // Find match
        const match = matches.find(m =>
          m.home_team.toLowerCase() === pred.homeTeam.toLowerCase() ||
          m.away_team.toLowerCase() === pred.awayTeam.toLowerCase()
        )
        
        if (!match) {
          matchNotFound.push(`${pred.homeTeam} vs ${pred.awayTeam}`)
          continue
        }

        parsed.push({
          participantName: participant.name,
          matchId: match.id,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeScore: pred.homeScore,
          awayScore: pred.awayScore,
          goalscorer: pred.goalscorer,
          rawLine: `${pred.homeTeam} ${pred.homeScore}-${pred.awayScore} ${pred.goalscorer || ''}`.trim(),
          confidence: 'high',
          issues: [],
        })
      }
    }
  } else {
    // Fallback: regex parsing
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    let currentParticipant: Participant | null = null

    for (const line of lines) {
      // Check if this looks like a participant name (no score pattern)
      if (!SCORE_PATTERN.test(line)) {
        const pResults = participantFuse.search(line)
        if (pResults.length && pResults[0].score! < 0.4) {
          const pid = pResults[0].item.id
          currentParticipant = participants.find(p => p.id === pid) || null
        }
        continue
      }

      if (!currentParticipant) {
        unmatched.push(line)
        continue
      }

      const predResult = parseLineRegex(line, matches, teamFuse)
      if (!predResult) {
        unmatched.push(line)
        continue
      }

      parsed.push({
        participantName: currentParticipant.name,
        ...predResult,
      })
    }
  }

  return {
    parsed,
    unmatched,
    participantNotFound,
    matchNotFound,
    totalLines: rawText.split('\n').filter(l => l.trim()).length,
  }
}
