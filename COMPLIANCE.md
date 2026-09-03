VERDICT: CHANGES_REQUESTED

## 1. DSGVO

**Befund 1 — Hochgeladene Nutzerbilder werden ohne Authentifizierung öffentlich ausgeliefert**  
_Schweregrad: hoch_  
`backend/app/main.py` mountet `app.mount("/uploads", StaticFiles(...))`. Die Bilder sind personenbezogene Daten bzw. können personenbezogene Inhalte enthalten (z. B. Person, Wohnung, Kleidungsstil). Sie sind ausschließlich über eine unguessbare UUID geschützt, aber ohne Zugriffskontrolle für jeden abrufbar, der die URL kennt. Das genügt nicht Art. 32 DSGVO (geeignete technische und organisatorische Maßnahmen).  
**Remedy:**  
- Statisches `/uploads`-Mount entfernen oder nur für Administrationszwecke hinter eine Authentifizierung legen.  
- Einen authentifizierten Bild-Endpunkt ergänzen, z. B. `GET /api/items/{item_id}/image`, der den `current_user` prüft und die Datei nur ausliefert, wenn das Item dem Nutzer gehört.  
- Zeitgleich die Frontend-Anzeige kompatibel umstellen: `image_url` auf den API-Endpunkt zeigen lassen, dort per `fetch` mit `Authorization: Bearer <token>` laden und als `blob:`-URL rendern.  
- Dabei sicherstellen, dass Garderobe, Outfit-Creator und Outfit-Details weiterhin korrekt funktionieren; ein geschützter Endpunkt darf die eigene Produktfunktion nicht blockieren (z. B. durch Blob-URLs statt `<img src="/uploads/...">`).

**Befund 2 — Datenschutzerklärung behandelt IP-Adressen/Rate-Limiting/Server-Logs nicht**  
_Schweregrad: mittel_  
Der Code verarbeitet IP-Adressen im `RateLimiter` (`backend/app/routers/auth.py`) und protokolliert im globalen Exception-Handler (`backend/app/main.py`) zumindest Methode und Pfad. In `frontend/src/pages/Privacy.jsx` werden nur E-Mail, Bilder und Outfits beschrieben. Die Verarbeitung von IP-Adressen und technischen Protokolldaten fehlt; ebenso die Rechtsgrundlage dafür.  
**Remedy:**  
- In `Privacy.jsx` einen Abschnitt „Technische Daten und Sicherheitsprotokolle“ ergänzen, in dem IP-Adressen und Zeitstempel von Fehlversuchen zur Missbrauchsverhinderung (Art. 6 Abs. 1 lit. f DSGVO) sowie technische Logs erläutert werden.  
- Die Speicherdauer präzisieren: z. B. „IP-Adressen werden ausschließlich im Arbeitsspeicher gehalten und nach spätestens 15 Minuten bzw. nach Ablauf des Sperrzeitraums gelöscht; Server-Logs werden nur bei Fehlern und ohne Klartext-Personendaten erzeugt.“  
- Falls ein Hosting-/Auftragsverarbeiter verwendet wird, ist dieser zu benennen (Art. 28 DSGVO); die aktuelle Aussage „keine Weitergabe an Dritte“ ist nur korrekt, wenn tatsächlich kein Hosting-Dienstleister eingesetzt wird.

**Befund 3 — Betroffenenrechte außer Löschung nicht technisch umgesetzt**  
_Schweregrad: mittel_  
Die Datenschutzerklärung verspricht Auskunft, Berichtigung, Löschung, Einschränkung. Im Code ist nur die Löschung (`DELETE /api/account`, `frontend/src/pages/Account.jsx`) umgesetzt. Es fehlen Endpunkte für Auskunft/Export und Berichtigung der E-Mail-Adresse bzw. ein dokumentierter manueller Prozess.  
**Remedy:**  
- Backend: `GET /api/account/export` ergänzen (liefert E-Mail, Kategorien, Outfits und ggf. Bild-Metadaten; Bilder über den geschützten Bild-Endpunkt).  
- Backend: `PUT /api/account` für die Änderung der E-Mail-Adresse ergänzen.  
- Datenschutzerklärung um die konkrete Ausübungsmöglichkeit ergänzen (z. B. „Über die Kontoseite oder per E-Mail an die im Impressum genannte Adresse“).  
- Frontend: Eine kleine Export-/Profilseite unter `/account` einbauen oder den Kontaktweg klar benennen.

**Befund 4 — Rate-Limiter speichert IP-Adressen ohne automatische Bereinigung**  
_Schweregrad: mittel_  
`backend/app/routers/auth.py` hält `_rate_limiter` als globales In-Memory-Dict. Abgelaufene Einträge werden nur bei erneutem Zugriff entfernt. In einem länger laufenden Prozess können IP-Adressen unnötig lange gespeichert bleiben. Das widerspricht dem Grundsatz der Speicherbegrenzung (Art. 5 Abs. 1 lit. e DSGVO).  
**Remedy:**  
- Einen periodischen Cleanup einbauen (z. B. `asyncio`-Task oder `threading.Timer`, der alle 5–10 Minuten abgelaufene `_failures`- und `_lockout_until`-Einträge löscht).  
- Alternativ eine TTL-basierte Struktur verwenden und die maximale Speicherdauer in der Datenschutzerklärung dokumentieren.

**Befund 5 — Keine Passwort-Mindestanforderungen**  
_Schweregrad: mittel_  
`backend/app/schemas.py` akzeptiert beliebige Passwortlängen (z. B. `password: str`) und das Frontend setzt keine Mindestlänge. Schwache Passwörter erhöhen das Risiko für unbefugten Zugriff (Art. 32 DSGVO).  
**Remedy:**  
- In `schemas.py` `password: str = Field(min_length=8, max_length=128)` ergänzen und ggf. eine Komplexitätsregel definieren.  
- Im Frontend `Register.jsx` eine Hinweistext und serverseitige Validierung ergänzen; Fehlermeldung bei zu kurzem Passwort.

**Befund 6 — JWT im localStorage + fehlende Security-Header**  
_Schweregrad: mittel_  
`frontend/src/context/AuthContext.jsx` speichert das JWT im `localStorage`. Bei einer XSS-Lücke kann das Token ausgelesen werden. Es fehlen zudem CSP, HSTS und weitere Sicherheitsheader.  
**Remedy:**  
- Mittelfristig auf `HttpOnly`, `Secure`, `SameSite=strict`-Cookie umstellen und CSRF-Schutz ergänzen.  
- Alternativ mindestens eine strikte Content-Security-Policy setzen, die nur `'self'` für Skripte, Styles und Verbindungen erlaubt und `img-src 'self' data: blob:` enthält.  
- Die CSP muss die eigenen Ressourcen (auch den Vite-Dev-Server bzw. Produktions-Build) weiterhin zulassen; vor Aktivierung testen, dass die App vollständig lädt und HMR im Dev-Modus weiter funktioniert.

## 2. EU Cyber Resilience Act (CRA)

**Befund 7 — Keine erkennbare SBOM, Sicherheitsdokumentation oder Update-/Patch-Policy**  
_Schweregrad: hoch_  
Für ein Produkt mit digitalen Elementen verlangt der CRA dokumentierte Sicherheitseigenschaften, eine SBOM, ein Verfahren für Updates/Patches und eine klare Support-/Meldestruktur. Im sichtbaren Code/Repository-Stand finden sich keine `SECURITY.md`, keine SBOM-Erzeugung, keine dokumentierte Update-Strategie und keine zentrale Sicherheitsdokumentation. Die Abhängigkeiten (`backend/requirements.txt`, `frontend/package.json`) sind vorhanden, aber ohne sichtbare Versionspins, Hashes oder Audit-Hinweise.  
**Remedy:**  
- `SECURITY.md` anlegen mit: unterstützte Versionen, Meldeprozess für Sicherheitslücken, Update-Zyklus, Patch-Prozess.  
- SBOM generieren und pflegen, z. B. mit `cyclonedx`/`pip-audit`/`npm audit` und in die CI-Pipeline integrieren.  
- Abhängigkeiten mit konkreten Versionen und Hashes pinnen (requirements.txt + package-lock.json prüfen).  
- In `README.md` oder `DESIGN.md` einen kurzen Abschnitt „Security Properties“ ergänzen (z. B. Argon2-Hashing, Rate-Limiting, Magic-Byte-Prüfung, CORS, Upload-Limit) und dokumentieren, wie Updates eingespielt werden.

## 3. EU AI Act

Kein Befund. Im Produkt ist keine KI-Funktion implementiert; der Anwendungsbereich des AI Act ist nicht eröffnet.

## 4. Pflichttexte & UI

**Befund 8 — Impressum enthält Platzhalterdaten und ist nicht rechtsgültig**  
_Schweregrad: hoch_  
`frontend/src/pages/Imprint.jsx` nennt „Musterstraße 1“, „Max Mustermann“, „kontakt@office-closet.example“ und kennzeichnet sich selbst als „fiktives Impressum mit Platzhalterdaten“. Das erfüllt nicht die Anbieterkennzeichnungspflicht (§ 5 DDG). Ein Produkt darf damit nicht veröffentlicht werden.  
**Remedy:**  
- Vor Veröffentlichung alle Platzhalter durch die tatsächlichen Betreiberangaben ersetzen (Name/Firma, ladungsfähige Anschrift, Kontakt, Vertretungsberechtigte).  
- Den Satz „Dies ist ein fiktives Impressum …“ vollständig entfernen.  
- Ggf. Handelsregister, USt-IdNr. und Aufsichtsbehörde ergänzen, sofern einschlägig.

**Befund 9 — Keine AGB/Nutzungsbedingungen**  
_Schweregrad: mittel_  
Die App begründet mit der Registrierung ein Vertragsverhältnis, es fehlen aber Nutzungsbedingungen. Das ist rechtlich nicht immer zwingend, aber für einen Marktgang unzureichend.  
**Remedy:**  
- `frontend/src/pages/Terms.jsx` anlegen (Leistungsumfang, Pflichten, Haftung, Lizenz, anwendbares Recht).  
- Links im Footer ergänzen und bei der Registrierung eine Checkbox „Nutzungsbedingungen akzeptiert“ vorsehen.

**Befund 10 — Cookie-/Consent-Hinweis nicht erforderlich, aber LocalStorage sollte erwähnt werden**  
_Schweregrad: niedrig_  
Es werden keine Cookies oder Drittanbieter-Requests eingesetzt; ein Consent-Banner ist verhältnismäßig. Die Datenschutzerklärung erwähnt aber nicht, dass das Auth-Token im `localStorage` liegt. Das sollte transparent gemacht werden.  
**Remedy:**  
- In `Privacy.jsx` einen Abschnitt „Lokale Speicherung“ ergänzen, in dem erklärt wird, dass das Anmeldetoken im Browser-LocalStorage gespeichert und beim Logout gelöscht wird.

## 5. Barrierefreiheit (WCAG/EAA/BITV)

**Befund 11 — Modale Dialoge ohne Fokus-Management und Escape-Bedienung**  
_Schweregrad: mittel_  
Sowohl in `frontend/src/pages/Account.jsx` als auch in `frontend/src/pages/Outfits.jsx` werden Dialoge mit `role="dialog"` geöffnet. Der Fokus wird nicht in den Dialog verschoben, nicht dort gehalten und `Escape` schließt nicht. Tastaturbenutzer können hinter den Dialog gelangen.  
**Remedy:**  
- `frontend/src/hooks/useFocusTrap.js` erstellen und in beiden Modals verwenden: Beim Öffnen Fokus auf den Dialog oder ersten Fokuspunkt setzen, Tab-Tasten innerhalb des Dialogs zirkulieren lassen, `Escape` schließt den Dialog, beim Schließen Fokus auf den öffnenden Button zurückgeben.  
- Das Overlay nicht nur mit `onClick` schließen, sondern auch per Escape erreichbar machen.

**Befund 12 — Mehrere Lösch-Buttons mit identischem zugänglichem Namen „Löschen“**  
_Schweregrad: mittel_  
In `frontend/src/pages/Wardrobe.jsx` (und teilweise in `Outfits.jsx`) gibt es mehrere Buttons mit demselben zugänglichen Namen „Löschen“. Für Screenreader-Nutzer ist nicht klar, welches Element gelöscht wird.  
**Remedy:**  
- Den Lösch-Buttons kontextspezifische `aria-label` geben, z. B. `aria-label={`Löschen: ${item.name}`}` bzw. `aria-label={`${outfit.name} löschen`}`.  
- Die sichtbare Beschriftung kann „Löschen“ bleiben, der Accessible Name muss eindeutig sein.

**Befund 13 — Farbkontrast der gedämpften Textfarbe möglicherweise unzureichend**  
_Schweregrad: niedrig_  
`frontend/src/styles/theme.css` definiert `--color-muted: #8c8172` auf `--color-bg: #0e0c0a`. Der Kontrast liegt möglicherweise unter 4,5:1 (WCAG AA). Das sollte vor Veröffentlichung gemessen werden.  
**Remedy:**  
- Mit einem Kontrast-Checker prüfen; falls unter 4,5:1, `--color-muted` auf einen helleren Wert anheben oder nur für große/sekundäre Texte verwenden.  
- Prüfen, ob `placeholder`- und Meldungstexte ebenfalls ausreichend Kontrast haben.

**Befund 14 — Formularfehler nicht mit Eingabefeldern verknüpft**  
_Schweregrad: niedrig_  
Die Formularfehler erscheinen als `role="alert"`, sind aber nicht per `aria-describedby` mit den zugehörigen Eingabefeldern verknüpft und setzen kein `aria-invalid`.  
**Remedy:**  
- In `frontend/src/pages/Login.jsx`, `Register.jsx`, `Wardrobe.jsx` den Fehlermeldungen eine `id` geben und per `aria-describedby` am Eingabefeld referenzieren.  
- Bei Fehlern `aria-invalid="true"` am Feld setzen und nach Korrektur entfernen.

---

**Gesamteinschätzung:**  
Das Produkt hat eine solide technische Basis: Argon2-Hashing, Magic-Byte-Prüfung, Upload-Limit, CORS-Beschränkung, Rate-Limiting und Account-Löschung sind umgesetzt. Die offenen Punkte betreffen vor allem den ungeschützten Abruf der Nutzerbilder, unvollständige Datenschutzerklärung, fehlende Betroffenenrechte, das nicht veröffentlichungsfähige Impressum sowie die fehlende CRA-Dokumentation. Diese Lücken sind behebbar, ohne die Kernfunktionen zu brechen, wenn die Bildanzeige kompatibel auf authentifizierte Abrufe umgestellt wird. Daher ist eine Änderungsschleife erforderlich.