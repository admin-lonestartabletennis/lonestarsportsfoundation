-- Run this once in the Cloudflare D1 Console after migration 002.
ALTER TABLE stories ADD COLUMN cover_zoom INTEGER NOT NULL DEFAULT 100;
ALTER TABLE stories ADD COLUMN cover_aspect TEXT NOT NULL DEFAULT '16:9';
