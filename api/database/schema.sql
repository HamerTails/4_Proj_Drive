CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    provider TEXT,
    provider_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
    name TEXT NOT NULL,
    storage_path TEXT,
    mime_type TEXT,
    size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shares (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE internal_shares (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN DEFAULT FALSE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMP;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

ALTER TABLE shares ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Index pour les requetes frequentes (listing dossier, corbeille, partages, recherche par token)
CREATE INDEX IF NOT EXISTS idx_nodes_user_parent     ON nodes (user_id, parent_id, is_trashed);
CREATE INDEX IF NOT EXISTS idx_nodes_user_trashed    ON nodes (user_id, is_trashed, trashed_at);
CREATE INDEX IF NOT EXISTS idx_nodes_name_search     ON nodes (user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_shares_token          ON shares (token);
CREATE INDEX IF NOT EXISTS idx_internal_shares_to    ON internal_shares (to_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_shares_node  ON internal_shares (node_id);
