-- =============================================================
-- SEED DATA — 55 PARTICIPANTS
-- =============================================================

INSERT INTO participants (name, winner_prediction, golden_boot_prediction, is_expert, expert_order) VALUES
('Codrin Constantinescu', 'Franta', 'Kane', FALSE, NULL),
('Mihai Florea', 'Spania', 'Mbappe', FALSE, NULL),
('Bogdan Dumitriu', 'Portugalia', 'Mbappe', TRUE, 2),
('Stefan Mihalache', 'Portugalia', 'Mbappe', TRUE, 3),
('Shadi Nassouh', 'Portugalia', 'Mbappe', FALSE, NULL),
('Theodor Simon', 'Spania', 'Kane', FALSE, NULL),
('Vlad Ungureanu', 'Portugalia', 'Kane', FALSE, NULL),
('Ana Ungureanu', 'Spania', 'Mbappe', FALSE, NULL),
('Dragos Dimitriu', 'Spania', 'Kane', FALSE, NULL),
('Andreas Bunduta', 'Portugalia', 'Ronaldo', TRUE, 5),
('Vlad Cozma', 'Franta', 'Kane', FALSE, NULL),
('Marius Ioan', 'Portugalia', 'Mbappe', FALSE, NULL),
('Daniel Hirtan', 'Spania', 'Mbappe', TRUE, 6),
('Dragos Cozma', 'Spania', 'Kane', FALSE, NULL),
('Dragos Constantin Cozma', 'Spania', 'Yamal', FALSE, NULL),
('Awad Mousa', 'Spania', 'Mbappe', FALSE, NULL),
('Gigel Pricop (Primob Husi)', 'Spania', 'Kane', FALSE, NULL),
('Renaldo Stoean', 'Franta', 'Haaland', TRUE, 1),
('Vlad Farcane', 'Spania', 'Kane', FALSE, NULL),
('Alex Tarca', 'Portugalia', 'Mbappe', FALSE, NULL),
('Sabin Pinzariu', 'Franta', 'Kane', FALSE, NULL),
('Sorin Modreanu', 'Franta', 'Mbappe', FALSE, NULL),
('Filip Havarneanu', 'Franta', 'Mbappe', FALSE, NULL),
('Robert Pasniceanu', 'Spania', 'Oyarzabal', FALSE, NULL),
('Costel Dobre', 'Franta', 'Mbappe', FALSE, NULL),
('Radu Gavriluti', 'Spania', 'Oyarzabal', FALSE, NULL),
('Dorel Gavriluti', 'Franta', 'Mbappe', FALSE, NULL),
('Bogdan Marinescu', 'Spania', 'Mbappe', FALSE, NULL),
('Andrei Ciocanaru', 'Germania', 'Kane', FALSE, NULL),
('Razvan Chirlejan', 'Spania', 'Kane', FALSE, NULL),
('Titus Andrian', '-', '-', FALSE, NULL),
('Lucian Apostol (Agle agle)', 'Franta', 'Mbappe', FALSE, NULL),
('Lucian Boz', 'Franta', 'Kane', FALSE, NULL),
('Bogdan Trofin', 'Franta', 'Mbappe', FALSE, NULL),
('Bogdan Lungu', 'Spania', 'Mbappe', FALSE, NULL),
('Silviu Cracana', 'Spania', 'Mbappe', FALSE, NULL),
('Cristian Bucsineanu', 'Spania', 'Kane', FALSE, NULL),
('Ovidiu Bulgariu', 'Spania', 'Mbappe', FALSE, NULL),
('Alin Ciubotaru', 'Spania', 'Mbappe', FALSE, NULL),
('Ovidiu Damian', 'Spania', 'Mbappe', FALSE, NULL),
('Albert Jarebe', 'Franta', 'Mbappe', TRUE, 4),
('Andrei Preda', 'Spania', 'Kane', FALSE, NULL),
('Alexandru Maxim', 'Spania', 'Mbappe', FALSE, NULL),
('David Busnosu', 'Franta', 'Olise', FALSE, NULL),
('Bogdan Balcan', 'Spania', 'Kane', FALSE, NULL),
('Dan Ungureanu', 'Spania', 'Kane', FALSE, NULL),
('Andreea Luca', 'Spania', 'Yamal', FALSE, NULL),
('Stefan Ifrim', 'Spania', 'Mbappe', FALSE, NULL),
('Radu Chirila', 'Franta', 'Mbappe', FALSE, NULL),
('Cornel Truta', 'Franta', 'Olise', FALSE, NULL),
('Marius Enachi', 'Franta', 'Kane', FALSE, NULL),
('Ciprian Philip', 'Portugalia', 'Kane', FALSE, NULL),
('Stejarel Ionescu', 'Spania', 'Haaland', FALSE, NULL),
('Andrei Luca', 'Portugalia', 'Ronaldo', FALSE, NULL),
('Maroan Kassir', 'Franta', 'Mbappe', FALSE, NULL);

-- Seed tournament predictions (same data)
INSERT INTO tournament_predictions (participant_id, winner_prediction, golden_boot_prediction)
SELECT id, winner_prediction, golden_boot_prediction
FROM participants
WHERE winner_prediction IS NOT NULL AND winner_prediction != '-';

-- Seed name aliases for common Facebook display name variations
UPDATE participants SET name_aliases = ARRAY['Renaldo', 'Stoean Renaldo', 'R. Stoean']
  WHERE name = 'Renaldo Stoean';

UPDATE participants SET name_aliases = ARRAY['Bogdan D', 'Dumitriu', 'B. Dumitriu']
  WHERE name = 'Bogdan Dumitriu';

UPDATE participants SET name_aliases = ARRAY['Stefan M', 'Mihalache Stefan']
  WHERE name = 'Stefan Mihalache';

UPDATE participants SET name_aliases = ARRAY['Andreas B', 'Bunduta', 'A. Bunduta']
  WHERE name = 'Andreas Bunduta';

UPDATE participants SET name_aliases = ARRAY['Gigel P', 'Gigel Pricop', 'Primob']
  WHERE name = 'Gigel Pricop (Primob Husi)';

UPDATE participants SET name_aliases = ARRAY['Lucian A', 'Agle agle', 'Lucian Apostol']
  WHERE name = 'Lucian Apostol (Agle agle)';

-- Seed example matchday (today's matches from screenshot)
INSERT INTO matchdays (match_date, label) VALUES ('2026-06-17', 'Ziua 7');

INSERT INTO matches (matchday_id, home_team, away_team, home_team_aliases, away_team_aliases, home_team_flag, away_team_flag, group_name, kickoff_at)
SELECT 
  id AS matchday_id,
  unnest(ARRAY['Portugalia', 'Anglia', 'Ghana', 'Uzbekistan']) AS home_team,
  unnest(ARRAY['RD Congo', 'Croatia', 'Panama', 'Columbia']) AS away_team,
  unnest(ARRAY[
    ARRAY['Portugal', 'POR', 'Portugalia'],
    ARRAY['England', 'ENG', 'Anglia'],
    ARRAY['GHA', 'Ghana'],
    ARRAY['UZB', 'Uzbekistan']
  ]::TEXT[][]) AS home_team_aliases,
  unnest(ARRAY[
    ARRAY['Congo', 'DR Congo', 'RDC', 'Democratic Republic', 'RD Congo'],
    ARRAY['CRO', 'Croatia', 'Hrvatska'],
    ARRAY['PAN', 'Panama'],
    ARRAY['COL', 'Colombia', 'Columbia']
  ]::TEXT[][]) AS away_team_aliases,
  unnest(ARRAY['🇵🇹', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇬🇭', '🇺🇿']) AS home_team_flag,
  unnest(ARRAY['🇨🇩', '🇭🇷', '🇵🇦', '🇨🇴']) AS away_team_flag,
  unnest(ARRAY['Grupa K', 'Grupa L', 'Grupa L', 'Grupa K']) AS group_name,
  unnest(ARRAY[
    '2026-06-17 20:00:00+03',
    '2026-06-17 23:00:00+03',
    '2026-06-18 02:00:00+03',
    '2026-06-18 05:00:00+03'
  ]::TIMESTAMPTZ[]) AS kickoff_at
FROM matchdays WHERE match_date = '2026-06-17';

-- Initialize leaderboard cache for all participants
INSERT INTO leaderboard_cache (participant_id, total_points, rank)
SELECT id, 0, row_number() OVER (ORDER BY name)
FROM participants;
