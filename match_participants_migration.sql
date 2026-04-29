<<<<<<< HEAD
-- Multi-player matches support
-- Run this in Supabase SQL Editor

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_year INTEGER;

UPDATE matches
SET match_year = EXTRACT(YEAR FROM NOW())::INTEGER
WHERE match_year IS NULL;

CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    participant_order INTEGER
);

  ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS participant_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_player_id ON match_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_deck_id ON match_participants(deck_id);

-- Optional: avoid duplicate same player in the same match
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_participants_match_player
ON match_participants(match_id, player_id);
=======
-- Multi-player matches support
-- Run this in Supabase SQL Editor

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_year INTEGER;

UPDATE matches
SET match_year = EXTRACT(YEAR FROM NOW())::INTEGER
WHERE match_year IS NULL;

CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    participant_order INTEGER
);

  ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS participant_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_player_id ON match_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_deck_id ON match_participants(deck_id);

-- Optional: avoid duplicate same player in the same match
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_participants_match_player
ON match_participants(match_id, player_id);
>>>>>>> e3e3bda (first)
