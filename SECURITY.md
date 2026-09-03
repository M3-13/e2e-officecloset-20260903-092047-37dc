VERDICT: CHANGES_REQUESTED

## Zusammenfassende Bewertung

Das Produkt ist insgesamt solide aufgebaut: Secrets werden nicht hartkodiert, `SECRET_KEY` ist beim Start verpflichtend, Passwörter werden mit Argon2 gehasht, SQL-Zugriffe erfolgen ausschließlich über das SQLAlchemy-ORM, Dateiuploads werden über Magic Bytes validiert und die API erzwingt eine restriktive CORS-Konfiguration. Es gibt jedoch mehrere mittlere Sicherheits- und Härtungsthemen, die vor einem Produktivbetrieb behoben werden sollten.

### Scanner-Lücken
- `bandit` und `semgrep` wurden übersprungen (`[skipped]`).
- `pip-audit` bzw. `npm audit` liegen nicht vor.

Aus dem Fehlen der Scanner-Ergebnisse wird kein eigener Befund abgeleitet. Vor einem Release sollten diese Scans jedoch nachgeholt werden, um veraltete oder verwundbare Abhängigkeiten auszuschließen.

---

## Sicherheitsbefunde

### 1. Statische `/uploads`-Auslieferung ohne Besitzerprüfung
**Schweregrad:** mittel  
**Betroffene Stelle:** `backend/app/main.py` – `app.mount("/uploads", StaticFiles(...))`, `backend/app/routers/items.py` – `_image_url()`, Frontend-Nutzung von `image_url` als `<img src>`

**Problem:**  
Hochgeladene Bilder werden unter `/uploads/{uuid}` ohne Authentifizierung ausgeliefert. Zwar sind UUIDs schwer zu erraten, aber jede Person, die eine gültige Bild-URL kennt oder abfangen kann, sieht das Bild unabhängig vom Besitzverhältnis. Das verletzt die Anforderung AC-08 („ein anderer Benutzer sieht ausschließlich seine eigenen Daten“) in Bezug auf gespeicherte Bilder.

**Konkreter Fix:**  
- Bilder nicht über ein öffentliches `StaticFiles`-Mount ausliefern, sondern über einen authentifizierten Endpoint, der die DB-Zugehörigkeit des Bildes zum aktuellen Benutzer prüft (z. B. `GET /api/items/{item_id}/image`).  
- Oder signierte, kurzlebige URLs verwenden, die der Server bei der Item-Ausgabe erzeugt.  
- Wichtig: Das Frontend lädt Bilder aktuell über `<img src="/uploads/...">`. Ein rein header-basiertes Bearer-Token funktioniert dort nicht. Deshalb muss die Auslieferung entweder über ein Cookie-Auth-Verfahren oder über signierte Query-Parameter erfolgen. Die Änderung muss mit der Frontend-Implementierung abgestimmt werden, damit die eigene Anzeige weiterhin funktioniert.

---

### 2. Rate-Limiter erfasst echte Client-IP nicht hinter Proxys und ist prozesslokal
**Schweregrad:** mittel  
**Betroffene Stelle:** `backend/app/routers/auth.py` – `_client_ip()` und `_rate_limiter`

**Problem:**  
Das Rate-Limiting nutzt `request.client.host`. In einem Deployment hinter einem Reverse-Proxy oder Vite-Dev-Proxy (`vite.config.js` leitet `/api` an `localhost:8000` weiter) sieht der Backend-Server für alle Anfragen nur die Proxy-IP (z. B. `127.0.0.1`). Dadurch wird die Sperre nach 5 Fehlversuchen pro Minute praktisch wirkungslos, weil alle Client-Anfragen auf denselben Schlüssel abgebildet werden. Zusätzlich ist der Limiter nur im Prozess-Speicher; bei mehreren Uvicorn-Workern existieren getrennte Zähler und die Sperre kann durch Verteilung der Angriffe umgangen werden.

**Konkreter Fix:**  
- Für produktive Bereitstellung einen gemeinsamen, persistenten Store (z. B. Redis) verwenden, damit alle Worker denselben Limiter teilen.  
- Die echte Client-IP bei vertrauenswürdigen Proxys über `X-Forwarded-For` bzw. `X-Real-IP` auswerten. Dabei die Liste vertrauenswürdiger Proxy-IPs explizit konfigurieren, um Header-Spoofing zu verhindern.  
- Beispiel: Middleware ergänzen, die bei konfiguriertem `TRUSTED_PROXIES` die erste nicht vertrauenswürdige IP aus `X-Forwarded-For` als Client-IP verwendet.

---

### 3. Fehlende Längen- und Formatvalidierung für Benutzereingaben
**Schweregrad:** mittel  
**Betroffene Stelle:** `backend/app/schemas.py` – `UserRegister`, `UserLogin`, `OutfitCreate`

**Problem:**  
E-Mail, Passwort, Item-Name, Kategorie und Outfit-Name sind nur als `str` ohne Längenbeschränkung definiert. Dadurch sind unter anderem möglich:
- Argon2-Hashing extrem langer Passwörter verursacht unnötig hohe CPU-/Speicherlast (DoS-Potenzial trotz Rate-Limiting).
- Zu lange Werte können in der Datenbank abgeschnitten oder zu unerwarteten Fehlern führen (je nach DB-Verhalten).
- Ungültige E-Mail-Formate werden akzeptiert.

**Konkreter Fix:**  
In `backend/app/schemas.py` Pydantic-Validierung ergänzen, z. B.:
- `email: EmailStr` (aus `pydantic[email]`) mit `max_length=255`.
- `password: str = Field(min_length=8, max_length=128)`.
- `name`, `category` und Outfit-Name mit `Field(max_length=255)` bzw. für Kategorie `max_length=50` und optional `Literal`-Enum.
- Item-/Outfit-Namen im Backend ebenfalls begrenzen, nicht nur im Frontend.

---

### 4. Unbehandelte `UnicodeDecodeError` beim Multipart-/Form-Urlencoded-Parsing
**Schweregrad:** niedrig  
**Betroffene Stelle:** `backend/app/routers/items.py` – `_read_multipart_form()`

**Problem:**  
In `on_field` wird `field.value.decode()` ohne Fehlerbehandlung aufgerufen. Sendet ein Angreifer ungültiges UTF-8 in einem Multipart-Feld, führt das zu einer unbehandelten `UnicodeDecodeError` und damit zu einer 500-Antwort. Dasselbe Risiko besteht im `else`-Zweig bei `body.decode("utf-8")`.

**Konkreter Fix:**  
- `decode("utf-8", errors="replace")` oder `try/except` um die Decodierung mit Rückgabe einer sauberen 400-Antwort.  
- Beispiel:
  ```python
  def _decode(value: bytes) -> str:
      try:
          return value.decode("utf-8")
      except UnicodeDecodeError:
          raise HTTPException(status_code=400, detail="Invalid encoding")
  ```
  und in `on_field`/`on_file` sowie beim Body-Decoding verwenden.

---

### 5. Account-Enumeration über Registrierungs-Endpoint
**Schweregrad:** niedrig  
**Betroffene Stelle:** `backend/app/routers/auth.py` – `register()`

**Problem:**  
Bei bereits registrierter E-Mail liefert der Endpoint eine eindeutige Fehlermeldung (`409 Conflict`, „Email already registered“). Ein Angreifer kann dadurch systematisch prüfen, welche E-Mail-Adressen im System registriert sind.

**Konkreter Fix:**  
- Die Antwort bei doppelter E-Mail so gestalten, dass sie keinen Rückschluss auf die Existenz erlaubt, z. B. generischer Hinweis: „Registrierung derzeit nicht möglich“ oder eine neutrale Erfolgsantwort in Kombination mit einer E-Mail-Bestätigung (sofern implementiert).  
- Alternativ bewusst in Kauf nehmen, wenn Produktanforderungen eine klare Duplikatsmeldung verlangen – dann Risiko dokumentieren und ggf. zusätzliche Rate-Limits beibehalten.

---

### 6. Race-Condition bei Registrierung führt zu 500
**Schweregrad:** niedrig  
**Betroffene Stelle:** `backend/app/routers/auth.py` – `register()`, DB-Constraint in `backend/app/models.py` (`email` unique)

**Problem:**  
Zwei parallele Registrierungen mit derselben E-Mail können dazu führen, dass beide `existing` als `None` sehen und anschließend ein `IntegrityError` beim `db.commit()` entsteht. Der globale Exception-Handler liefert dann eine 500-Antwort.

**Konkreter Fix:**  
- `IntegrityError` beim `db.commit()` abfangen und in `HTTPException(status_code=409, detail="Email already registered")` umwandeln.  
- Optional vorher `db.rollback()` aufrufen, damit die Session konsistent bleibt.

---

## Positiv geprüfte Aspekte

- **Secrets:** Kein hartkodierter `SECRET_KEY`; Start bricht ab, falls er nicht gesetzt ist. `.env` ist in `.gitignore` ausgeschlossen.
- **Injection:** SQL-Zugriffe über SQLAlchemy-ORM; keine Shell-/Kommandoausführung; keine unsafe Deserialization.
- **Uploads:** Magic-Byte-Prüfung beschränkt auf JPEG, PNG, WebP; Größenlimit vor dem vollständigen Einlesen des Bodys; UUID-basierte Dateinamen verhindern Path-Traversal.
- **AuthN/AuthZ:** Argon2-Passwort-Hashes mit Algorithmus-Präfix; JWT mit Ablauf; API-Ressourcen werden konsequent auf `user_id` gefiltert. Outfit-Erstellung prüft Besitz aller referenzierten Items.
- **CORS:** `Access-Control-Allow-Origin` nur für die konfigurierte Frontend-Origin, nicht `*`.
- **Fehlerbehandlung:** Globaler Exception-Handler verhindert detaillierte Stack-Traces in API-Antworten.

---

## Empfohlene Priorisierung für die Umsetzung

1. **Befund 1 (statische `/uploads`-Auslieferung)** beheben – Datenschutz und AC-08.
2. **Befund 2 (Rate-Limiter-IP hinter Proxy)** beheben – Wirksamkeit der Brute-Force-Sperre sicherstellen.
3. **Befund 3 (Längen-/Formatvalidierung)** – DoS-Potenzial und Datenintegrität.
4. Niedrige Befunde 4–6 zeitnah mit umsetzen, da sie wenig Aufwand erfordern.

Insgesamt ist das Produkt aus Sicherheitssicht gut gebaut, benötigt aber vor einem Kunden-Release die oben genannten Nachbesserungen.