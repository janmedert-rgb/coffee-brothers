# Coffee Brothers Reservierungs-API
## Briefing für CB-OS Mini-PC

**Base URL:** `https://coffee-brothers.de`

**Bearer Token (geheim, in CB-OS .env):**
```
CBOS_API_TOKEN=cbos_live_14d7d42fad8d2003dddd8bdc6ece036cf24131885e1a1062166599389ff3be47
```

Token bei Kompromittierung neu generieren mit: `node -e "console.log('cbos_live_' + require('crypto').randomBytes(32).toString('hex'))"`

---

## Endpoints

### 1. GET `/api/reservations/pending`
Pullt alle aktiven Reservierungen. CB-OS dedupliziert per `external_id` (UPSERT).

**Request:**
```http
GET /api/reservations/pending HTTP/1.1
Host: coffee-brothers.de
Authorization: Bearer cbos_live_...
```

**Optional Query-Param:**
- `?since=<iso-timestamp>` — nur Reservierungen mit `updated_at > since` (Optimierung)

**Response 200:**
```json
{
  "reservations": [
    {
      "external_id": "b3f1e8a2-9c4d-4e6f-a7b8-1c2d3e4f5a6b",
      "name": "Max Mustermann",
      "email": "max@example.com",
      "phone": "+49 151 12345678",
      "party_size": 4,
      "reservation_at": "2026-05-20T19:00:00+02:00",
      "type": "Coffee Date",
      "children": "Ja, 1 Kind",
      "message": "Anlass: Coffee Date\nKinder: Ja, 1 Kind\nNachricht: Bitte am Fenster",
      "status": "pending",
      "source": "website",
      "created_at": "2026-05-12T14:23:11+02:00"
    }
  ],
  "count": 1,
  "server_time": "2026-05-13T09:50:00.000Z"
}
```

**Standard-Filter (ohne `since`):**
- Reservierungen der letzten 60 Tage
- Mit `reservation_at > now() - 1 Tag` (vergangene werden ignoriert)

**Errors:**
- `401 invalid_token`
- `500 database_error`

---

### 2. POST `/api/reservations/:external_id/status`
Status setzen. Triggert Mail #2 an Gast.

**Request:**
```http
POST /api/reservations/b3f1e8a2-.../status HTTP/1.1
Host: coffee-brothers.de
Authorization: Bearer cbos_live_...
Content-Type: application/json

{
  "status": "confirmed",
  "note": "Tisch am Fenster reserviert, freuen uns!",
  "if_current_status": "pending"
}
```

- `status` (required): `"confirmed"` oder `"declined"`
- `note` (optional, string oder null): wird in der Mail an Gast eingefügt
- `if_current_status` (optional): Optimistic Lock. Wenn aktueller Status nicht matcht → 409

**Response 200:**
```json
{
  "external_id": "b3f1e8a2-...",
  "status": "confirmed",
  "mail_sent": true
}
```

**Bei zweitem Push (idempotent):**
```json
{
  "external_id": "b3f1e8a2-...",
  "status": "confirmed",
  "mail_sent": false,
  "idempotent": true
}
```

**Errors:**
- `400 invalid_status` — status ≠ confirmed/declined
- `401 invalid_token`
- `404 not_found` — external_id existiert nicht
- `409 status_already_set` — schon in anderem finalen Status
- `409 status_changed` — wenn `if_current_status` nicht matcht
- `500 database_error`

---

## Status-Flow

```
Gast füllt Formular auf coffee-brothers.de/reservieren
        ↓
POST /api/reservations (öffentlich, kein Auth)
        ↓
DB: INSERT mit status='pending', external_id=UUID
        ↓
Mail #1 (Eingangsbestätigung) an Gast
        ↓
─── CB-OS pollt alle 60s ───
        ↓
GET /api/reservations/pending → bekommt neue Reservierung
        ↓
Owner sieht Reservierung im Dashboard, klickt Confirm/Decline
        ↓
POST /api/reservations/{id}/status mit Bearer-Auth
        ↓
DB: UPDATE status, status_note, confirmation_mail_sent_at
        ↓
Mail #2 (Confirm/Decline) an Gast
        ↓
Response 200 mit mail_sent: true
```

---

## Polling-Empfehlung

```python
# In CB-OS (Python pseudo-code):
import requests
import time

API = "https://coffee-brothers.de/api"
TOKEN = os.environ["CBOS_API_TOKEN"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

last_pull = None

while True:
    try:
        params = {"since": last_pull} if last_pull else {}
        r = requests.get(f"{API}/reservations/pending", headers=HEADERS, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        for reservation in data["reservations"]:
            upsert_local(reservation)  # per external_id
        last_pull = data["server_time"]
    except Exception as e:
        log.warning(f"Pull failed: {e}, retry in 60s")
    time.sleep(60)
```

---

## DB-Schema (zur Info)

```sql
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  external_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER NOT NULL,
  reservation_at TIMESTAMPTZ NOT NULL,
  type TEXT,
  children TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|declined|expired
  status_note TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  confirmation_mail_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Edge-Cases Vereinbarungen

| Fall | Verhalten |
|---|---|
| CB-OS pullt mehrfach dasselbe | API antwortet identisch, CB-OS dedupliziert per `external_id` |
| Status zweimal pushen | API antwortet 200, schickt keine zweite Mail (Idempotenz via `confirmation_mail_sent_at`) |
| `reservation_at` in Vergangenheit + Status `pending` | Tägliche Cleanup-Function setzt auf `expired` |
| Mini-PC offline für Stunden | Alle `pending` bleiben in DB, beim nächsten Pull nachgeholt |
| Token kompromittiert | Neuen Token generieren, in Netlify Env-Vars `CBOS_API_TOKEN` ersetzen, CB-OS-Service neu starten |
| Website-API down | CB-OS retried alle 60s, Status-Pushes werden gequeued |

---

## Smoke Test

```bash
# 1. Pending pullen (sollte leeres Array zurückgeben)
curl -H "Authorization: Bearer $CBOS_API_TOKEN" \
  https://coffee-brothers.de/api/reservations/pending

# 2. Test-Reservierung via Form auf https://coffee-brothers.de/reservieren

# 3. Nochmal pullen — sollte 1 Reservierung enthalten
curl -H "Authorization: Bearer $CBOS_API_TOKEN" \
  https://coffee-brothers.de/api/reservations/pending

# 4. Confirm pushen
curl -X POST \
  -H "Authorization: Bearer $CBOS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","note":"Test"}' \
  https://coffee-brothers.de/api/reservations/<external_id>/status
```
