-- Verify current leaders and add missing ones
-- This script will show what's currently in the database and add any missing leaders

-- First, show current count
SELECT COUNT(*) as current_leader_count FROM leaders;

-- Show current leaders by faction
SELECT 
  faction,
  COUNT(*) as leader_count,
  STRING_AGG(name, ', ' ORDER BY name) as leaders
FROM leaders
GROUP BY faction
ORDER BY faction;

-- Now add missing leaders using a simpler approach that doesn't require unique constraint
-- Base Game Leaders
INSERT INTO leaders (name, faction) 
SELECT name, faction FROM (VALUES
  ('Paul Atreides', 'House Atreides'),
  ('Duke Leto Atreides', 'House Atreides'),
  ('Baron Vladimir Harkonnen', 'House Harkonnen'),
  ('Glossu "Beast" Rabban', 'House Harkonnen'),
  ('Count Ilban Richese', 'House Richese'),
  ('Helena Richese', 'House Richese'),
  ('Archduke Armand Thorvald', 'House Thorvald'),
  ('Countess Ariana Thorvald', 'House Thorvald')
) AS v(name, faction)
WHERE NOT EXISTS (
  SELECT 1 FROM leaders l WHERE l.name = v.name AND l.faction = v.faction
);

-- Rise of Ix Expansion Leaders
INSERT INTO leaders (name, faction) 
SELECT name, faction FROM (VALUES
  ('Prince Rhombur Vernius', 'House Vernius'),
  ('Tessia Vernius', 'House Vernius'),
  ('Lord Yuna Corrino', 'House Corrino'),
  ('Ione Thorvald', 'House Thorvald')
) AS v(name, faction)
WHERE NOT EXISTS (
  SELECT 1 FROM leaders l WHERE l.name = v.name AND l.faction = v.faction
);

-- Uprising Leaders
INSERT INTO leaders (name, faction) 
SELECT name, faction FROM (VALUES
  ('Princess Irulan', 'House Corrino'),
  ('Lady Jessica', 'Bene Gesserit'),
  ('Gurney Halleck', 'House Atreides'),
  ('Shishakli', 'Fremen'),
  ('Amber Metelli', 'House Metelli'),
  ('Emperor Shaddam IV', 'Emperor')
) AS v(name, faction)
WHERE NOT EXISTS (
  SELECT 1 FROM leaders l WHERE l.name = v.name AND l.faction = v.faction
);

-- Bloodlines/Immortality Expansion Leaders
INSERT INTO leaders (name, faction) 
SELECT name, faction FROM (VALUES
  ('Steersman Y''rkoon', 'Spacing Guild'),
  ('Wensicia Corrino', 'House Corrino'),
  ('Baroness Thea Thorvald', 'House Thorvald')
) AS v(name, faction)
WHERE NOT EXISTS (
  SELECT 1 FROM leaders l WHERE l.name = v.name AND l.faction = v.faction
);

-- Update "Piter" to "Piter De Vries" if it exists and the new name doesn't
UPDATE leaders 
SET name = 'Piter De Vries' 
WHERE name = 'Piter' 
AND faction = 'House Harkonnen'
AND NOT EXISTS (
  SELECT 1 FROM leaders WHERE name = 'Piter De Vries' AND faction = 'House Harkonnen'
);

-- Final verification - show all leaders after insert
SELECT 
  COUNT(*) as total_leaders,
  COUNT(DISTINCT faction) as total_factions
FROM leaders;

SELECT 
  faction,
  COUNT(*) as leader_count,
  STRING_AGG(name, ', ' ORDER BY name) as leaders
FROM leaders
GROUP BY faction
ORDER BY faction;

