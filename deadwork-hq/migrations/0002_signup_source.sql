-- Right now a signup row says nothing about where it came from. `source` is the visitor's own
-- document.referrer at the moment they submitted the form (or the literal string 'direct' when
-- there was no referrer), and `page` is the site path the form lived on (e.g. '/loadout/') — see
-- assets/js/notify.js. Deliberately NOT real UTM-parameter parsing: referrer + page path is
-- enough for a first version. Both nullable: old cached copies of notify.js (before this shipped)
-- never send these fields at all, and that must keep working exactly as it did before.
ALTER TABLE signups ADD COLUMN source TEXT;
ALTER TABLE signups ADD COLUMN page TEXT;
