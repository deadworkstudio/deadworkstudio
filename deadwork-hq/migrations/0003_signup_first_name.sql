-- The signup forms now ask for a first name (assets/js/notify.js sends it as firstName). Saved
-- next to the email so the admin list and CSV show who signed up. Nullable: rows from before this
-- shipped, and any submission from an old cached notify.js, have no name.
ALTER TABLE signups ADD COLUMN first_name TEXT;
