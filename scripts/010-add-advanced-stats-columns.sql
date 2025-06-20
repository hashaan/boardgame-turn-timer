-- Add advanced statistics columns to playthrough_results table
ALTER TABLE playthrough_results 
ADD COLUMN IF NOT EXISTS leader_id TEXT,
ADD COLUMN IF NOT EXISTS leader_name TEXT,
ADD COLUMN IF NOT EXISTS final_vp INTEGER,
ADD COLUMN IF NOT EXISTS final_resources_spice INTEGER,
ADD COLUMN IF NOT EXISTS final_resources_solari INTEGER,
ADD COLUMN IF NOT EXISTS final_resources_water INTEGER,
ADD COLUMN IF NOT EXISTS final_resources_troops INTEGER,
ADD COLUMN IF NOT EXISTS cards_trashed INTEGER,
ADD COLUMN IF NOT EXISTS final_deck_size INTEGER,
ADD COLUMN IF NOT EXISTS strategic_archetype_id TEXT,
ADD COLUMN IF NOT EXISTS strategic_archetype_name TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playthrough_results_leader_id ON playthrough_results(leader_id);
CREATE INDEX IF NOT EXISTS idx_playthrough_results_archetype_id ON playthrough_results(strategic_archetype_id);

-- Update any existing Dune game results to have proper structure
UPDATE playthrough_results 
SET 
  leader_name = COALESCE(leader_name, 'Unknown'),
  final_vp = COALESCE(final_vp, 0)
WHERE playthrough_id IN (
  SELECT p.id 
  FROM playthroughs p 
  JOIN games g ON p.game_id = g.id 
  WHERE g.game_type = 'dune'
);
