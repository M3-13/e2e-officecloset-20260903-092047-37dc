# OfficeCloset — Glamouröser Kleiderschrank-Manager

Eine Fullstack-Web-App im eleganten Red-Carpet-Look, in der Benutzer sich registrieren
und einloggen, Kleidungsstücke (mit Bild und Kategorie) anlegen, ihre Garderobe
durchstöbern und im Outfit-Creator Einzelteile zu gespeicherten Outfits kombinieren.

## Tech-Stack

- **Backend:** Python, FastAPI
- **Frontend:** React mit Vite
- **Datenbank:** SQLite (über SQLAlchemy ORM)
- **Auth:** JWT (Bearer), Passwort-Hashing mit Argon2
- **Storage:** lokales Dateisystem für Bild-Uploads

## Installation

```bash
cd backend
python -m pip install -r requirements.txt
```

## Entwicklung / Start

Der Server benötigt einen `SECRET_KEY`. Er wird nicht mitgeliefert (kein Geheimnis im
Repo) — vor dem Start einmal erzeugen und exportieren:

```bash
# Linux / macOS
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
cd backend && python -m uvicorn app.main:app --port 8000
```

```powershell
# Windows (PowerShell)
$env:SECRET_KEY = py -c "import secrets; print(secrets.token_hex(32))"
cd backend
py -m uvicorn app.main:app --port 8000
```

Alternativ die Variablen aus `backend/.env.example` kopieren und setzen.

Beim Start legt die App das Datenbank-Schema automatisch an (kein manueller
Migrationsschritt nötig). Der Startpfad wird auch maschinenlesbar in `RUN.json`
beschrieben.

## Konfiguration (ENV-Variablen)

| Variable          | Bedeutung                                  | Default                 |
| ----------------- | ------------------------------------------ | ----------------------- |
| `DATABASE_URL`    | SQLAlchemy-Datenbank-URL                   | `sqlite:///./dev.db`    |
| `SECRET_KEY`      | Schlüssel zum Signieren der JWTs (Pflicht) | – (wird generiert)      |
| `UPLOAD_DIR`      | Verzeichnis für hochgeladene Bilder        | `./uploads`             |
| `FRONTEND_ORIGIN` | Erlaubte CORS-Origin der Frontend-App      | `http://localhost:5173` |
| `MAX_UPLOAD_MB`   | Maximale Upload-Größe in MB                | `5`                     |

`SECRET_KEY` muss gesetzt sein; fehlt er, verweigert der Server den Start mit einer
verständlichen Meldung. In `RUN.json` wird er pro Lauf generiert (nie im Repo); für den
lokalen Start erzeugt ihn der Export-Befehl oben oder die Vorlage `backend/.env.example`.

## API (Basis `/api`, Antworten als JSON, Fehler immer `{"detail": str}`)

Auth per `Authorization: Bearer <JWT>` (JWT-Claim `sub` = Benutzer-ID).

| Methode | Pfad                          | Beschreibung                          | Erfolg |
| ------- | ----------------------------- | ------------------------------------- | ------ |
| GET     | `/api/health`                 | Health-Check                          | 200 `{"status":"ok"}` |
| POST    | `/api/auth/register`          | Registrierung `{email, password}`     | 201 `UserOut` |
| POST    | `/api/auth/login`             | Login `{email, password}`             | 200 `{access_token, token_type}` |
| POST    | `/api/auth/logout`            | Logout                                | 204 |
| GET     | `/api/items?category=...`     | Eigene Kleidungsstücke (filterbar)    | 200 `[ItemOut]` |
| POST    | `/api/items`                  | Kleidungsstück anlegen (multipart)    | 201 `ItemOut` |
| DELETE  | `/api/items/{id}`             | Kleidungsstück löschen                | 204 |
| GET     | `/api/outfits`                | Eigene Outfits                        | 200 `[OutfitOut]` |
| POST    | `/api/outfits`                | Outfit anlegen `{name, item_ids}`     | 201 `OutfitOut` |
| GET     | `/api/outfits/{id}`           | Einzelnes Outfit                      | 200 `OutfitOut` |
| DELETE  | `/api/outfits/{id}`           | Outfit löschen                        | 204 |
| DELETE  | `/api/account`                | Konto samt Daten löschen              | 204 |

Antworttypen:

- `UserOut`: `{id: int, email: str}`
- `ItemOut`: `{id: int, name: str, category: str, image_url: str|null}`
- `OutfitOut`: `{id: int, name: str, item_ids: [int], items: [ItemOut]}`

Hochgeladene Bilder werden unter `/uploads/<datei>` ausgeliefert.

## Features

- Registrierung & Login mit JWT-Auth (Argon2-Passwort-Hashes)
- Garderobe mit Kategorien und Bild-Upload (JPEG/PNG/WebP, Größenlimit)
- Outfit-Creator und Outfit-Übersicht
- Kontolöschung inkl. Bereinigung aller Daten
- Red-Carpet-Optik (dunkle Farben, goldene Akzente)

## Tests

```bash
cd backend
PYTHONPATH=. python -m pytest
```
