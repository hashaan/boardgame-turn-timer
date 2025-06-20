-- Test basic database connection and table structure
SELECT 
  'playthroughs' as table_name,
  COUNT(*) as row_count
FROM playthroughs
UNION ALL
SELECT 
  'playthrough_results' as table_name,
  COUNT(*) as row_count
FROM playthrough_results
UNION ALL
SELECT 
  'games' as table_name,
  COUNT(*) as row_count
FROM games
ORDER BY table_name;

-- Test advanced stats columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'playthrough_results' 
  AND column_name IN (
    'leader_id', 'leader_name', 'final_vp', 
    'final_resources_spice', 'final_resources_solari', 
    'final_resources_water', 'final_resources_troops',
    'cards_trashed', 'final_deck_size',
    'strategic_archetype_id', 'strategic_archetype_name'
  )
ORDER BY column_name;
