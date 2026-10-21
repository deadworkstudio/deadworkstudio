CREATE TABLE signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  product TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(email, product)
);
CREATE INDEX idx_signups_email ON signups(email);
CREATE INDEX idx_signups_product ON signups(product);
