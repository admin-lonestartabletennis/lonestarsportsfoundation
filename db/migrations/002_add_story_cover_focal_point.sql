-- Run this once in the Cloudflare D1 Console for databases created before
-- cover focal-point controls were added.
ALTER TABLE stories ADD COLUMN cover_focal_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE stories ADD COLUMN cover_focal_y INTEGER NOT NULL DEFAULT 50;
