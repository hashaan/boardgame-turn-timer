-- Add game_type column to games table with proper error handling
DO $$ 
BEGIN
    -- Add game_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'games' AND column_name = 'game_type'
    ) THEN
        ALTER TABLE games ADD COLUMN game_type VARCHAR(50) DEFAULT 'standard';
    END IF;
END $$;

-- Create leaders table for Dune: Imperium
CREATE TABLE IF NOT EXISTS leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  faction VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Dune: Imperium leaders (only if table is empty)
INSERT INTO leaders (name, faction) 
SELECT * FROM (VALUES
  ('Esmar Tuek', 'Spacing Guild'),
  ('Stilgar', 'Fremen'),
  ('Chani', 'Fremen'),
  ('Feyd-Rautha Harkonnen', 'House Harkonnen'),
  ('Gaius Helen Mohiam', 'Bene Gesserit'),
  ('Margot Fenring', 'Bene Gesserit'),
  ('Liet Kynes', 'Fremen'),
  ('Staban Tuek', 'Spacing Guild'),
  ('Piter', 'House Harkonnen'),
  ('Kota Odax of Ix', 'Ixians'),
  ('Duncan Idaho', 'House Atreides'),
  ('Count Hasimir Fenring', 'Emperor')
) AS v(name, faction)
WHERE NOT EXISTS (SELECT 1 FROM leaders LIMIT 1);

-- Add leader_id to playthrough_results for Dune games
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'leader_id'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN leader_id UUID REFERENCES leaders(id);
    END IF;
END $$;

-- Add enhanced stats columns for Dune games
DO $$ 
BEGIN
    -- Add final_vp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'final_vp'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN final_vp INTEGER;
    END IF;
    
    -- Add final_resources_spice column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'final_resources_spice'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN final_resources_spice INTEGER;
    END IF;
    
    -- Add final_resources_solari column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'final_resources_solari'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN final_resources_solari INTEGER;
    END IF;
    
    -- Add final_resources_water column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'final_resources_water'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN final_resources_water INTEGER;
    END IF;
    
    -- Add cards_trashed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'cards_trashed'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN cards_trashed INTEGER;
    END IF;
    
    -- Add final_deck_size column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'final_deck_size'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN final_deck_size INTEGER;
    END IF;
END $$;

-- Create strategic archetypes table
CREATE TABLE IF NOT EXISTS strategic_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert strategic archetypes for Dune (only if table is empty)
INSERT INTO strategic_archetypes (name, description) 
SELECT * FROM (VALUES
  ('Combat', 'Focus on military strength and conflict'),
  ('SMF (Spice Must Flow)', 'Spice-focused strategy'),
  ('Alliances', 'Building and leveraging faction alliances'),
  ('Spy-Control', 'Information and control-based strategy'),
  ('Hybrid', 'Balanced approach across multiple strategies'),
  ('Economic', 'Resource accumulation and management'),
  ('Tech/Intrigue', 'Technology and intrigue card focus')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM strategic_archetypes LIMIT 1);

-- Add strategic archetype to playthrough results
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playthrough_results' AND column_name = 'strategic_archetype_id'
    ) THEN
        ALTER TABLE playthrough_results ADD COLUMN strategic_archetype_id UUID REFERENCES strategic_archetypes(id);
    END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_playthrough_results_leader_id') THEN
        CREATE INDEX idx_playthrough_results_leader_id ON playthrough_results(leader_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_playthrough_results_strategic_archetype_id') THEN
        CREATE INDEX idx_playthrough_results_strategic_archetype_id ON playthrough_results(strategic_archetype_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_games_game_type') THEN
        CREATE INDEX idx_games_game_type ON games(game_type);
    END IF;
END $$;
