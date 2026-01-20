-- Add all missing Dune: Imperium leaders
-- This script adds leaders that are missing from the database
-- It checks for existing leaders by name and faction to avoid duplicates

-- First, ensure we have a unique constraint on (name, faction) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leaders_name_faction_unique'
    ) THEN
        ALTER TABLE leaders ADD CONSTRAINT leaders_name_faction_unique UNIQUE (name, faction);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        -- Constraint might already exist with a different name, that's okay
        NULL;
END $$;

-- Base Game Leaders (12 leaders)
INSERT INTO leaders (name, faction) 
SELECT * FROM (VALUES
  ('Paul Atreides', 'House Atreides'),
  ('Duke Leto Atreides', 'House Atreides'),
  ('Baron Vladimir Harkonnen', 'House Harkonnen'),
  ('Glossu "Beast" Rabban', 'House Harkonnen'),
  ('Count Ilban Richese', 'House Richese'),
  ('Helena Richese', 'House Richese'),
  ('Archduke Armand Thorvald', 'House Thorvald'),
  ('Countess Ariana Thorvald', 'House Thorvald'),
  ('Duncan Idaho', 'House Atreides'),
  ('Stilgar', 'Fremen'),
  ('Chani', 'Fremen'),
  ('Feyd-Rautha Harkonnen', 'House Harkonnen')
) AS v(name, faction)
ON CONFLICT (name, faction) DO NOTHING;

-- Rise of Ix Expansion Leaders
INSERT INTO leaders (name, faction) 
SELECT * FROM (VALUES
  ('Prince Rhombur Vernius', 'House Vernius'),
  ('Tessia Vernius', 'House Vernius'),
  ('Lord Yuna Corrino', 'House Corrino'),
  ('Ione Thorvald', 'House Thorvald'),
  ('Kota Odax of Ix', 'Ixians')
) AS v(name, faction)
ON CONFLICT (name, faction) DO NOTHING;

-- Uprising Leaders
INSERT INTO leaders (name, faction) 
SELECT * FROM (VALUES
  ('Princess Irulan', 'House Corrino'),
  ('Lady Jessica', 'Bene Gesserit'),
  ('Gurney Halleck', 'House Atreides'),
  ('Shishakli', 'Fremen'),
  ('Amber Metelli', 'House Metelli'),
  ('Emperor Shaddam IV', 'Emperor')
) AS v(name, faction)
ON CONFLICT (name, faction) DO NOTHING;

-- Bloodlines/Immortality Expansion Leaders
INSERT INTO leaders (name, faction) 
SELECT * FROM (VALUES
  ('Esmar Tuek', 'Spacing Guild'),
  ('Staban Tuek', 'Spacing Guild'),
  ('Piter De Vries', 'House Harkonnen'),
  ('Steersman Y''rkoon', 'Spacing Guild'),
  ('Gaius Helen Mohiam', 'Bene Gesserit'),
  ('Margot Fenring', 'Bene Gesserit'),
  ('Liet Kynes', 'Fremen'),
  ('Count Hasimir Fenring', 'Emperor'),
  ('Wensicia Corrino', 'House Corrino'),
  ('Baroness Thea Thorvald', 'House Thorvald')
) AS v(name, faction)
ON CONFLICT (name, faction) DO NOTHING;

-- Update existing "Piter" to "Piter De Vries" if it exists
UPDATE leaders 
SET name = 'Piter De Vries' 
WHERE name = 'Piter' AND faction = 'House Harkonnen'
AND NOT EXISTS (
  SELECT 1 FROM leaders WHERE name = 'Piter De Vries' AND faction = 'House Harkonnen'
);

-- Verify all leaders are present
SELECT 
  faction,
  COUNT(*) as leader_count,
  STRING_AGG(name, ', ' ORDER BY name) as leaders
FROM leaders
GROUP BY faction
ORDER BY faction;

