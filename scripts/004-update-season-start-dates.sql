-- Update Season 1 start dates to May 25th, 2024
UPDATE seasons 
SET start_date = '2024-05-25 00:00:00+00'::timestamp with time zone
WHERE season_number = 1;

-- Update the trigger function to use May 25th as the default start date for new Season 1s
CREATE OR REPLACE FUNCTION create_initial_season()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO seasons (group_id, season_number, status, start_date)
    VALUES (NEW.id, 1, 'active', '2024-05-25 00:00:00+00'::timestamp with time zone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the updated function
DROP TRIGGER IF EXISTS trigger_create_initial_season ON groups;
CREATE TRIGGER trigger_create_initial_season
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_season();
