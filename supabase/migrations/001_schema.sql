-- =============================================================
-- WORLD CUP 2026 PREDICTION CONTEST — COMPLETE DATABASE SCHEMA
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy name matching for parser

-- =============================================================
-- PARTICIPANTS
-- =============================================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_aliases TEXT[] DEFAULT '{}', -- alternative spellings from Facebook
  winner_prediction TEXT,           -- predicted World Cup winner
  golden_boot_prediction TEXT,      -- predicted top scorer
  is_expert BOOLEAN DEFAULT FALSE,  -- pinned expert flag
  expert_order INT,                 -- display order for experts page
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_participants_name ON participants USING gin(name gin_trgm_ops);
CREATE INDEX idx_participants_is_expert ON participants(is_expert) WHERE is_expert = TRUE;

-- =============================================================
-- MATCHES
-- =============================================================
CREATE TABLE matchdays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_date DATE NOT NULL UNIQUE,
  label TEXT, -- e.g. "Ziua 1 - Grupa A"
  facebook_import_raw TEXT, -- raw pasted comment text
  import_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matchdays_date ON matchdays(match_date);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matchday_id UUID NOT NULL REFERENCES matchdays(id) ON DELETE CASCADE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_aliases TEXT[] DEFAULT '{}', -- POR, Portugalia, Portugal, etc.
  away_team_aliases TEXT[] DEFAULT '{}',
  home_team_flag TEXT,  -- emoji flag
  away_team_flag TEXT,
  group_name TEXT,      -- "Grupa K", "Optimi", etc.
  kickoff_at TIMESTAMPTZ,
  -- Final result (entered by admin)
  home_score INT,
  away_score INT,
  result_entered_at TIMESTAMPTZ,
  -- For tournament predictions validation
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_matchday ON matches(matchday_id);
CREATE INDEX idx_matches_home ON matches USING gin(home_team gin_trgm_ops);
CREATE INDEX idx_matches_away ON matches USING gin(away_team gin_trgm_ops);

-- =============================================================
-- GOALSCORER EVENTS (per match)
-- =============================================================
CREATE TABLE match_goalscorers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_aliases TEXT[] DEFAULT '{}',
  goals INT NOT NULL DEFAULT 1,
  is_own_goal BOOLEAN DEFAULT FALSE,  -- if TRUE: negative for pickers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goalscorers_match ON match_goalscorers(match_id);

CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('missed_penalty','red_card','own_goal')),
  player_name TEXT NOT NULL,
  player_aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_match ON match_events(match_id);

-- =============================================================
-- PREDICTIONS
-- =============================================================
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  -- Predicted score
  home_score_pred INT NOT NULL,
  away_score_pred INT NOT NULL,
  -- Predicted goalscorer
  goalscorer_pred TEXT,
  -- Points (calculated after result entry)
  pts_exact_score INT DEFAULT 0,       -- +4 or 0
  pts_correct_outcome INT DEFAULT 0,   -- +2 or 0
  pts_goalscorer INT DEFAULT 0,        -- +1 per goal
  pts_own_goal_penalty INT DEFAULT 0,  -- -2 per event
  pts_missed_penalty INT DEFAULT 0,    -- -2 per event
  pts_red_card_penalty INT DEFAULT 0,  -- -2 per event
  pts_total INT DEFAULT 0,             -- sum of all above
  is_calculated BOOLEAN DEFAULT FALSE,
  -- Metadata
  source TEXT DEFAULT 'facebook_import',
  raw_text TEXT, -- original prediction line from Facebook
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, match_id)
);

CREATE INDEX idx_predictions_participant ON predictions(participant_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_predictions_uncalculated ON predictions(match_id) WHERE is_calculated = FALSE;

-- =============================================================
-- TOURNAMENT PREDICTIONS (winner + golden boot)
-- These are evaluated once at end of tournament
-- =============================================================
CREATE TABLE tournament_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE UNIQUE,
  winner_prediction TEXT NOT NULL,
  golden_boot_prediction TEXT NOT NULL,
  pts_winner INT DEFAULT 0,       -- +4 if correct
  pts_golden_boot INT DEFAULT 0,  -- +2 if correct
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- LEADERBOARD CACHE (updated after each calculation)
-- =============================================================
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE UNIQUE,
  total_points INT DEFAULT 0,
  pts_by_matchday JSONB DEFAULT '{}', -- {"2026-06-12": 8, "2026-06-13": 4, ...}
  rank INT,
  prev_rank INT,
  matches_predicted INT DEFAULT 0,
  matches_exact INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_rank ON leaderboard_cache(rank);
CREATE INDEX idx_leaderboard_points ON leaderboard_cache(total_points DESC);

-- =============================================================
-- STATISTICS CACHE (per match)
-- =============================================================
CREATE TABLE match_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  score_distribution JSONB DEFAULT '{}',    -- {"3-0": 20, "2-1": 14, ...}
  goalscorer_distribution JSONB DEFAULT '{}', -- {"Mbappe": 35, "Haaland": 29, ...}
  total_predictions INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ADMIN SESSIONS (single admin, no Supabase Auth needed)
-- =============================================================
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- =============================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participants_updated BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_predictions_updated BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- CALCULATE POINTS FOR A SINGLE PREDICTION
-- Called after admin enters match result
-- =============================================================
CREATE OR REPLACE FUNCTION calculate_prediction_points(p_match_id UUID)
RETURNS INT AS $$
DECLARE
  v_match RECORD;
  v_pred RECORD;
  v_goalscorer RECORD;
  v_event RECORD;
  v_pts_exact INT;
  v_pts_outcome INT;
  v_pts_scorer INT;
  v_pts_events INT;
  v_total INT;
  v_goals_scored INT;
  v_updated INT := 0;
BEGIN
  -- Get match result
  SELECT home_score, away_score INTO v_match
  FROM matches WHERE id = p_match_id AND home_score IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % has no result yet', p_match_id;
  END IF;
  
  -- Loop through all predictions for this match
  FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    v_pts_exact := 0;
    v_pts_outcome := 0;
    v_pts_scorer := 0;
    v_pts_events := 0;
    
    -- 1. Exact score: +4
    IF v_pred.home_score_pred = v_match.home_score AND 
       v_pred.away_score_pred = v_match.away_score THEN
      v_pts_exact := 4;
    -- 2. Correct outcome (win/draw): +2
    ELSIF (v_pred.home_score_pred > v_pred.away_score_pred AND v_match.home_score > v_match.away_score)
       OR (v_pred.home_score_pred < v_pred.away_score_pred AND v_match.home_score < v_match.away_score)
       OR (v_pred.home_score_pred = v_pred.away_score_pred AND v_match.home_score = v_match.away_score) THEN
      v_pts_outcome := 2;
    END IF;
    
    -- 3. Goalscorer points (+1 per goal scored by predicted player)
    IF v_pred.goalscorer_pred IS NOT NULL THEN
      SELECT COALESCE(SUM(goals), 0) INTO v_goals_scored
      FROM match_goalscorers
      WHERE match_id = p_match_id
        AND is_own_goal = FALSE
        AND (
          lower(player_name) = lower(v_pred.goalscorer_pred)
          OR lower(v_pred.goalscorer_pred) = ANY(SELECT lower(a) FROM unnest(player_aliases) a)
        );
      v_pts_scorer := v_goals_scored; -- +1 per goal
      
      -- 4. Negative events for predicted player
      -- Own goal by predicted player: -2
      SELECT COUNT(*) INTO v_pts_events
      FROM match_goalscorers
      WHERE match_id = p_match_id
        AND is_own_goal = TRUE
        AND (
          lower(player_name) = lower(v_pred.goalscorer_pred)
          OR lower(v_pred.goalscorer_pred) = ANY(SELECT lower(a) FROM unnest(player_aliases) a)
        );
      IF v_pts_events > 0 THEN
        v_pts_scorer := v_pts_scorer - 2;
        v_pts_events := -2;
      ELSE
        v_pts_events := 0;
      END IF;
      
      -- Missed penalty by predicted player: -2 each
      FOR v_event IN 
        SELECT * FROM match_events 
        WHERE match_id = p_match_id 
          AND event_type = 'missed_penalty'
          AND (
            lower(player_name) = lower(v_pred.goalscorer_pred)
            OR lower(v_pred.goalscorer_pred) = ANY(SELECT lower(a) FROM unnest(player_aliases) a)
          )
      LOOP
        v_pts_events := v_pts_events - 2;
      END LOOP;
      
      -- Red card by predicted player: -2 each
      FOR v_event IN
        SELECT * FROM match_events
        WHERE match_id = p_match_id
          AND event_type = 'red_card'
          AND (
            lower(player_name) = lower(v_pred.goalscorer_pred)
            OR lower(v_pred.goalscorer_pred) = ANY(SELECT lower(a) FROM unnest(player_aliases) a)
          )
      LOOP
        v_pts_events := v_pts_events - 2;
      END LOOP;
    END IF;
    
    v_total := v_pts_exact + v_pts_outcome + v_pts_scorer + v_pts_events;
    
    UPDATE predictions SET
      pts_exact_score = v_pts_exact,
      pts_correct_outcome = v_pts_outcome,
      pts_goalscorer = v_pts_scorer,
      pts_own_goal_penalty = CASE WHEN v_pts_events < 0 THEN v_pts_events ELSE 0 END,
      pts_total = v_total,
      is_calculated = TRUE
    WHERE id = v_pred.id;
    
    v_updated := v_updated + 1;
  END LOOP;
  
  -- Update match statistics
  PERFORM update_match_statistics(p_match_id);
  
  -- Refresh leaderboard
  PERFORM refresh_leaderboard();
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- UPDATE MATCH STATISTICS
-- =============================================================
CREATE OR REPLACE FUNCTION update_match_statistics(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_score_dist JSONB;
  v_scorer_dist JSONB;
  v_total INT;
BEGIN
  -- Score distribution
  SELECT 
    jsonb_object_agg(score, cnt),
    SUM(cnt)
  INTO v_score_dist, v_total
  FROM (
    SELECT 
      home_score_pred::TEXT || '-' || away_score_pred::TEXT AS score,
      COUNT(*) AS cnt
    FROM predictions
    WHERE match_id = p_match_id
    GROUP BY home_score_pred, away_score_pred
    ORDER BY cnt DESC
  ) t;
  
  -- Goalscorer distribution
  SELECT jsonb_object_agg(gs, cnt)
  INTO v_scorer_dist
  FROM (
    SELECT goalscorer_pred AS gs, COUNT(*) AS cnt
    FROM predictions
    WHERE match_id = p_match_id AND goalscorer_pred IS NOT NULL
    GROUP BY goalscorer_pred
    ORDER BY cnt DESC
  ) t;
  
  INSERT INTO match_statistics (match_id, score_distribution, goalscorer_distribution, total_predictions)
  VALUES (p_match_id, COALESCE(v_score_dist, '{}'), COALESCE(v_scorer_dist, '{}'), COALESCE(v_total, 0))
  ON CONFLICT (match_id) DO UPDATE SET
    score_distribution = EXCLUDED.score_distribution,
    goalscorer_distribution = EXCLUDED.goalscorer_distribution,
    total_predictions = EXCLUDED.total_predictions,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- REFRESH LEADERBOARD
-- =============================================================
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
DECLARE
  v_row RECORD;
  v_pts_by_day JSONB;
  v_rank INT := 1;
BEGIN
  -- Build per-participant aggregates
  FOR v_row IN
    SELECT 
      p.id AS participant_id,
      COALESCE(SUM(pr.pts_total), 0) + COALESCE(tp.pts_winner, 0) + COALESCE(tp.pts_golden_boot, 0) AS total_points,
      COUNT(pr.id) AS matches_predicted,
      COUNT(pr.id) FILTER (WHERE pr.pts_exact_score = 4) AS matches_exact
    FROM participants p
    LEFT JOIN predictions pr ON pr.participant_id = p.id AND pr.is_calculated = TRUE
    LEFT JOIN tournament_predictions tp ON tp.participant_id = p.id
    GROUP BY p.id, tp.pts_winner, tp.pts_golden_boot
    ORDER BY total_points DESC
  LOOP
    -- Build pts_by_matchday JSON
    SELECT jsonb_object_agg(
      md.match_date::TEXT,
      day_pts
    )
    INTO v_pts_by_day
    FROM (
      SELECT 
        m.matchday_id,
        COALESCE(SUM(pr2.pts_total), 0) AS day_pts
      FROM predictions pr2
      JOIN matches m ON m.id = pr2.match_id
      WHERE pr2.participant_id = v_row.participant_id AND pr2.is_calculated = TRUE
      GROUP BY m.matchday_id
    ) sub
    JOIN matchdays md ON md.id = sub.matchday_id;
    
    -- Upsert leaderboard row
    INSERT INTO leaderboard_cache (participant_id, total_points, pts_by_matchday, rank, matches_predicted, matches_exact)
    VALUES (v_row.participant_id, v_row.total_points, COALESCE(v_pts_by_day, '{}'), v_rank, v_row.matches_predicted, v_row.matches_exact)
    ON CONFLICT (participant_id) DO UPDATE SET
      prev_rank = leaderboard_cache.rank,
      total_points = EXCLUDED.total_points,
      pts_by_matchday = EXCLUDED.pts_by_matchday,
      rank = v_rank,
      matches_predicted = EXCLUDED.matches_predicted,
      matches_exact = EXCLUDED.matches_exact,
      last_updated = NOW();
    
    v_rank := v_rank + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_goalscorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for display data
CREATE POLICY "public_read_participants" ON participants FOR SELECT USING (TRUE);
CREATE POLICY "public_read_matchdays" ON matchdays FOR SELECT USING (TRUE);
CREATE POLICY "public_read_matches" ON matches FOR SELECT USING (TRUE);
CREATE POLICY "public_read_predictions" ON predictions FOR SELECT USING (TRUE);
CREATE POLICY "public_read_goalscorers" ON match_goalscorers FOR SELECT USING (TRUE);
CREATE POLICY "public_read_events" ON match_events FOR SELECT USING (TRUE);
CREATE POLICY "public_read_tournament" ON tournament_predictions FOR SELECT USING (TRUE);
CREATE POLICY "public_read_leaderboard" ON leaderboard_cache FOR SELECT USING (TRUE);
CREATE POLICY "public_read_statistics" ON match_statistics FOR SELECT USING (TRUE);

-- Service role (admin API) has full access via service_role key
-- No need for additional policies as service_role bypasses RLS
