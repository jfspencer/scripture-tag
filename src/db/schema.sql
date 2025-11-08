-- SQLite schema for scripture tagging system
-- Note: Scripture data is NOT stored in SQLite; it's loaded from static JSON files
-- This database only stores user-generated tags and annotations

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  icon TEXT,
  priority INTEGER,
  created_at INTEGER NOT NULL,
  user_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL,
  token_ids TEXT NOT NULL,  -- JSON array stored as TEXT
  user_id TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  last_modified INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_tag_id ON annotations(tag_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_last_modified ON annotations(last_modified);

-- Tag styles table
CREATE TABLE IF NOT EXISTS tag_styles (
  tag_id TEXT PRIMARY KEY,
  user_id TEXT,
  background_color TEXT,
  text_color TEXT,
  underline_style TEXT,
  underline_color TEXT,
  font_weight TEXT,
  icon TEXT,
  icon_position TEXT,
  opacity REAL,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tag_styles_user_id ON tag_styles(user_id);

