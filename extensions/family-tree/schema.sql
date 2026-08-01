CREATE TABLE IF NOT EXISTS family_trees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT    UNIQUE NOT NULL,
  title      TEXT    NOT NULL,
  data       TEXT    NOT NULL DEFAULT '{}',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TRIGGER IF NOT EXISTS family_trees_updated_at AFTER UPDATE ON family_trees BEGIN
  UPDATE family_trees SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = new.id;
END;
