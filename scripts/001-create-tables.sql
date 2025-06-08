-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL
);

-- Create group_access table for tracking user access to groups
CREATE TABLE IF NOT EXISTS group_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    UNIQUE(group_id, name)
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, name)
);

-- Create playthroughs table
CREATE TABLE IF NOT EXISTS playthroughs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255) NOT NULL
);

-- Create playthrough_results table
CREATE TABLE IF NOT EXISTS playthrough_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playthrough_id UUID REFERENCES playthroughs(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    rank INTEGER NOT NULL,
    CHECK (rank > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_group_access_group_id ON group_access(group_id);
CREATE INDEX IF NOT EXISTS idx_group_access_user_id ON group_access(user_id);
CREATE INDEX IF NOT EXISTS idx_games_group_id ON games(group_id);
CREATE INDEX IF NOT EXISTS idx_players_group_id ON players(group_id);
CREATE INDEX IF NOT EXISTS idx_playthroughs_game_id ON playthroughs(game_id);
CREATE INDEX IF NOT EXISTS idx_playthroughs_group_id ON playthroughs(group_id);
CREATE INDEX IF NOT EXISTS idx_playthrough_results_playthrough_id ON playthrough_results(playthrough_id);
CREATE INDEX IF NOT EXISTS idx_playthrough_results_player_id ON playthrough_results(player_id);
