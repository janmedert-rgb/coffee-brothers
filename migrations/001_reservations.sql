-- migrations/001_reservations.sql
-- DB-Schema für Coffee Brothers Reservierungen
-- Auf Neon Postgres ausführen (entweder via Neon Console SQL Editor oder psql)

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  external_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
  reservation_at TIMESTAMPTZ NOT NULL,
  type TEXT,                                -- z.B. "Bagel-Frühstück", "Coffee Date", "Geburtstag"
  children TEXT,                            -- z.B. "Mit Kindern (mit Kinderecke)" oder NULL
  message TEXT,                             -- freier Text vom Gast (max 500 chars validiert auf API-Seite)
  status TEXT NOT NULL DEFAULT 'pending'    -- 'pending' | 'confirmed' | 'declined' | 'expired'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'expired')),
  status_note TEXT,                         -- optional: was CB-OS bei confirm/decline geschickt hat
  source TEXT NOT NULL DEFAULT 'website',   -- 'website' | 'phone' | 'walk-in' (für spätere Erweiterung)
  confirmation_mail_sent_at TIMESTAMPTZ,    -- gesetzt nach Mail #2 → Idempotenz-Garant
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_at ON reservations(reservation_at);
CREATE INDEX IF NOT EXISTS idx_reservations_updated_at ON reservations(updated_at);

-- Optional: Beispiel-Reservierung zum Testen
-- INSERT INTO reservations (external_id, name, email, party_size, reservation_at, type)
-- VALUES (gen_random_uuid(), 'Test Gast', 'test@example.com', 2, now() + interval '2 days', 'Coffee Date');
