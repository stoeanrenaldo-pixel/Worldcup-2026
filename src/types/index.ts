// =============================================================
// WORLD CUP 2026 — TYPE DEFINITIONS
// =============================================================

export interface Participant {
  id: string
  name: string
  name_aliases: string[]
  winner_prediction: string | null
  golden_boot_prediction: string | null
  is_expert: boolean
  expert_order: number | null
  created_at: string
  updated_at: string
}

export interface Matchday {
  id: string
  match_date: string // "2026-06-17"
  label: string | null
  facebook_import_raw: string | null
  import_processed_at: string | null
  created_at: string
}

export interface Match {
  id: string
  matchday_id: string
  home_team: string
  away_team: string
  home_team_aliases: string[]
  away_team_aliases: string[]
  home_team_flag: string | null
  away_team_flag: string | null
  group_name: string | null
  kickoff_at: string | null
  home_score: number | null
  away_score: number | null
  result_entered_at: string | null
  is_final: boolean
  created_at: string
}

export interface MatchGoalscorer {
  id: string
  match_id: string
  player_name: string
  player_aliases: string[]
  goals: number
  is_own_goal: boolean
}

export interface MatchEvent {
  id: string
  match_id: string
  event_type: 'missed_penalty' | 'red_card' | 'own_goal'
  player_name: string
  player_aliases: string[]
}

export interface Prediction {
  id: string
  participant_id: string
  match_id: string
  home_score_pred: number
  away_score_pred: number
  goalscorer_pred: string | null
  pts_exact_score: number
  pts_correct_outcome: number
  pts_goalscorer: number
  pts_own_goal_penalty: number
  pts_missed_penalty: number
  pts_red_card_penalty: number
  pts_total: number
  is_calculated: boolean
  raw_text: string | null
  created_at: string
}

export interface TournamentPrediction {
  id: string
  participant_id: string
  winner_prediction: string
  golden_boot_prediction: string
  pts_winner: number
  pts_golden_boot: number
  is_resolved: boolean
}

export interface LeaderboardEntry {
  id: string
  participant_id: string
  total_points: number
  pts_by_matchday: Record<string, number> // { "2026-06-12": 8, ... }
  rank: number
  prev_rank: number | null
  matches_predicted: number
  matches_exact: number
  last_updated: string
  // Joined:
  participant?: Participant
}

export interface MatchStatistics {
  match_id: string
  score_distribution: Record<string, number> // { "3-0": 20, "2-1": 14 }
  goalscorer_distribution: Record<string, number> // { "Mbappe": 35, ... }
  total_predictions: number
  updated_at: string
}

// =============================================================
// FACEBOOK IMPORT PARSER TYPES
// =============================================================

export interface ParsedPrediction {
  participantName: string
  matchId: string | null
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  goalscorer: string | null
  rawLine: string
  confidence: 'high' | 'medium' | 'low'
  issues: string[]
}

export interface ImportParseResult {
  parsed: ParsedPrediction[]
  unmatched: string[]
  participantNotFound: string[]
  matchNotFound: string[]
  totalLines: number
}

// =============================================================
// AI PARSER RESPONSE
// =============================================================

export interface AIParsedBlock {
  participantName: string
  predictions: {
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    goalscorer: string | null
  }[]
}

// =============================================================
// ADMIN FORM TYPES
// =============================================================

export interface CreateMatchdayInput {
  match_date: string
  label: string
  matches: CreateMatchInput[]
}

export interface CreateMatchInput {
  home_team: string
  away_team: string
  home_team_flag?: string
  away_team_flag?: string
  group_name?: string
  kickoff_at?: string
}

export interface EnterResultInput {
  match_id: string
  home_score: number
  away_score: number
  goalscorers: {
    player_name: string
    goals: number
    is_own_goal: boolean
  }[]
  events: {
    event_type: 'missed_penalty' | 'red_card' | 'own_goal'
    player_name: string
  }[]
}

export interface ImportFacebookInput {
  matchday_id: string
  raw_text: string
}

// =============================================================
// LEADERBOARD WITH COLUMNS
// =============================================================

export interface LeaderboardWithColumns {
  entries: (LeaderboardEntry & { participant: Participant })[]
  matchdays: Matchday[]
  totalMatchdays: number
}

// =============================================================
// EXPERT COMPARISON
// =============================================================

export interface ExpertComparison {
  match: Match
  predictions: {
    expert: Participant
    prediction: Prediction | null
  }[]
  consensus: {
    score: string | null
    goalscorer: string | null
  }
}
