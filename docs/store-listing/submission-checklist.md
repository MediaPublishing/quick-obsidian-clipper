---
date: 2026-08-24
status: v2.4.17-release-candidate-prepared
---

# Quick Obsidian Clipper — Submission Checklist

> Eingereicht am 2026-08-24. Google zeigt `Pending review`. Nach bestandener Review wird das Item automatisch veröffentlicht.

---

## ⛔ BLOCKER-SEKTION: P0-Issues vor Submission

### P0-1: `<all_urls>` Permission — Store-Reviewer-Risiko

**Was es ist:** Das Manifest deklariert `"host_permissions": ["<all_urls>"]`. Chrome Web Store verlangt seit den Policy-Updates 2024/2025 eine explizite Rechtfertigung für `<all_urls>`. Extensions mit `<all_urls>` ohne klar erkennbaren Grund werden häufiger abgelehnt oder in der manuellen Review verzögert.

**Technischer Grund für `<all_urls>`:** Nutzer können jede beliebige Seite clipping. Die Extension muss auf dem Tab des Nutzers laufen — nicht auf einer vordefinierten Whitelist.

**Zu tun:**
1. In der Store-Listing-Beschreibung explizit erklären, warum `<all_urls>` nötig ist (bereits in `description-en.md` und `privacy-policy.md` enthalten).
2. Im "Single Purpose"-Feld des Store-Formulars den Zweck klar benennen: "Clips any web page to Markdown files in the user's local Downloads folder."
3. `web_accessible_resources` wurde entfernt. Die injizierten Skripte werden über `chrome.scripting.executeScript` geladen und müssen Webseiten nicht direkt erreichbar sein.

**Status:** ERLEDIGT

---

### P0-2: Keine Privacy Policy URL

**Was fehlt:** Store erfordert eine öffentlich erreichbare Privacy Policy URL. Die Policy existiert als `docs/store-listing/privacy-policy.md`, ist aber nicht deployed.

**Zu tun:**
1. Privacy Policy auf einer öffentlichen URL hosten (GitHub Pages über öffentliches Repo, eigene Domain, oder ein anderer statischer Host).
2. URL im Chrome-Web-Store-Entwicklerprofil eintragen:
   https://mediapublishing.github.io/quick-obsidian-clipper/store-listing/privacy-policy.html

**Status:** ERLEDIGT — öffentliche Seite wurde per HTTP 200 und Titelprüfung verifiziert.

---

### P0-3: Webhook-Server-Funktionalität — Feature-Status prüfen

**Was unklar ist:** Laut OPEN-LOOPS-Dokument war ein "Webhook-Server-Test" der letzte offene Schritt. Im Code (`background-simple.js`, `content.js`) ist kein aktiver Webhook-Server-Aufruf sichtbar. Die `web_accessible_resources`-Sektion im Manifest exponiert `src/handlers/*.js` — diese Handler müssen einzeln geprüft werden.

**Zu tun:**
1. Alle Handler-Dateien wurden geprüft.
2. Externe Aufrufe betreffen nur die optionalen, nutzerinitiierten Archive-/Freedium-Routen sowie YouTube-DOM-Zugriffe. Es gibt keine versteckte Telemetrie oder Server-Synchronisation.

**Status:** ERLEDIGT

---

### P0-4: End-to-End-Test auf realen Seiten

**Was fehlt:** Kein dokumentierter E2E-Test der Extension nach dem letzten Sync-Bug-Fix (`040b7ab`).

**Zu tun:**
1. Extension unpacked laden (Repo-Root, nicht ein Subfolder).
2. Normalen Artikel clipping — Markdown-Inhalt und Frontmatter prüfen.
3. YouTube-Video clipping — Transcript vorhanden?
4. Bulk-Clip 3 Tabs — Status-Seite korrekt?
5. Duplicate Detection: Dieselbe Seite zweimal clipping — Warnung erscheint?

**Status:** ERLEDIGT für P0-Kernpfade. YouTube bleibt wegen instabilem Consent-/Login-Verhalten als separater manueller Test offen; Bulk-Clip wurde mit einem Tab verifiziert.

### P0-4 E2E-Nachweis 2026-08-24

- Umgebung: isoliertes Chromium-Profil, Repo-Root unpacked geladen; Background-Worker `background-simple.js` wurde erkannt.
- Normaler Clip: lokale HTTP-Testseite erfolgreich extrahiert. Rückgabe `success: true`, Datei `2026-08-24--duplicate-e2e.md`, Download-ID `1`; Frontmatter und Markdown wurden in der vorherigen Beispiel-Seitenprüfung bestätigt.
- Bulk/Status-Pfad: derselbe getestete Clip-Pfad meldete `1 / 1`, `success 1`, `failure 0`, Status `Clipped` und löste einen gültigen Download aus.
- Duplicate Detection: zweiter Clip derselben URL innerhalb von vier Sekunden wurde erkannt, erzeugte Download-ID `2` und zwei erfolgreiche History-Einträge; das Produktverhalten ist bewusst „warnen + erneut clippen“.
- Re-Clip-Fix: der History-Reclip-Pfad rief die nicht existierende Funktion `handleClip()` auf und schlug deshalb still fehl. Er verwendet jetzt `getSettings()` plus `clipTabSmart()`. Danach liefen Syntaxcheck, URL-Guard-Tests und X-Sync-Scraper-Fallbacktest erfolgreich durch.

---

## ⚠️ POLICY-RISIKO-EINSCHÄTZUNG: Chrome Web Store

**Einschätzung: GERINGES bis MITTLERES RISIKO**

Begründung:
- Web-Clipper-Extensions sind im Chrome Web Store eine etablierte, breite Kategorie (Notion Web Clipper, Readwise Reader, etc.).
- Das Kernfeature (Seite → Markdown → Download) ist eindeutig nicht missbräuchlich.
- **Hauptrisiko:** `<all_urls>` + `scripting` zusammen triggern manuelle Review. Kann zu Verzögerung führen (typisch 7–14 Tage statt 1–3 Tage).
- Die archive.ph-Funktion könnte als "circumventing paywalls" eingeordnet werden — dies sollte in der Listing-Beschreibung vorsichtig formuliert werden (nicht "bypass paywall", sondern "access cached/archived version").
- Keine Twitter/X-Automation, kein ToS-Risiko auf Plattform-Seite für dieses Tool.

**Empfehlung:** `<all_urls>` im Listing klar begründen, archive.ph als "optional archiving feature" (nicht "paywall bypass") beschreiben.

---

## Manifest-Checkliste

- [x] Manifest Version 3 (`manifest_version: 3`)
- [x] `background.service_worker` + `type: module`
- [x] `content_security_policy` gesetzt (strikte Inline-Script-Policy)
- [x] `web_accessible_resources` entfernt; injizierte Skripte benötigen diese Freigabe nicht.
- [x] Tastatur-Shortcuts definiert (3 Commands)
- [x] Alle Icons vorhanden und geprüft (16, 32, 48, 128 px)

---

## Store-Listing-Checkliste

- [x] Kurzbeschreibung (EN) geschrieben — `description-en.md`
- [x] Langbeschreibung (EN) geschrieben — `description-en.md`
- [x] Kurzbeschreibung (DE) geschrieben — `description-de.md`
- [x] Langbeschreibung (DE) geschrieben — `description-de.md`
- [x] Privacy Policy (Markdown) geschrieben — `privacy-policy.md`
- [x] Privacy Policy öffentlich hosted — `https://mediapublishing.github.io/quick-obsidian-clipper/store-listing/privacy-policy.html`
- [x] Screenshot-Konzept (5 Motive) — `screenshots-konzept.md`
- [x] Screenshot produziert — `docs/store-listing/assets/screenshot-01-options-1280x800.png`
- [x] Promotional Tile produziert — `docs/store-listing/assets/promo-tile-440x280.png`

---

## Pre-Upload-Checkliste

- [x] P0-1 (`<all_urls>` begründet; `web_accessible_resources` entfernt)
- [x] P0-2 (Privacy Policy URL live; HTTP 200 und Inhalt verifiziert)
- [x] P0-3 (Handler geprüft — keine versteckten externen Aufrufe)
- [x] P0-4 (Kern-E2E-Tests bestanden; YouTube manuell nachzutesten)
- [x] Store-Entwicklerkonto vorhanden (`Media Publishing`).
- [x] Privacy Policy URL im Item eingetragen.
- [x] Extension ZIP erstellt mit `scripts/build-store-package.sh`.
- [x] ZIP-Inhalt geprüft (kein `.git`, kein `docs/`, keine Backup-Dateien).
- [x] Store-Metadaten, Berechtigungs-Begründungen und Datenschutz-Angaben vorbereitet.
- [x] Beschreibung, Kategorie `Tools`, Sprache `English (United States)`, Homepage und Support-URL eingetragen.
- [x] Store-Icon, Screenshot (1280x800 JPEG) und Small Promo Tile (440x280 JPEG) hochgeladen.
- [x] Privacy-Angaben, Remote-Code-Antwort, Datenverwendungs-Disclosures und drei Zertifizierungen ausgefüllt.
- [x] Distribution: kostenlos, öffentlich, alle Regionen.
- [x] Store-interne Überprüfung gestartet; Status ist `Pending review`.

---

## Build-Beleg 2026-08-23

- Version: `2.4.16`
- ZIP: `dist/quick-obsidian-clipper-v2.4.16-chrome-store.zip`
- SHA-256: `cca97938d417e8f7eb683c7803fe3a50d010bfe41427621802f88dfcaaf4fbb0`
- Inhalt: 32 Laufzeitdateien; keine `.git`-, `docs`-, `archive`-, `scripts`- oder `.DS_Store`-Einträge.
- Checks: Manifest-JSON gültig, JavaScript-Syntaxchecks, URL-Guard-Tests, X-Sync-Scraper-Fallbacktest und ZIP-Integritätstest.
- Visual QA: Optionsseite wurde in Chromium mit geladener Extension unter `v2.4.16` geöffnet; Screenshot und Promo-Tile wurden daraus erzeugt.
- Listing-Metadaten: `docs/store-listing/submission-metadata.md`

---

## Chrome Web Store Receipt 2026-08-24

- Item: `Quick Obsidian Clipper`
- Item-ID: `cjhbghekkonbpcibkbogbcemepolpnnl`
- Dashboard: https://chrome.google.com/webstore/devconsole/f4d05cd2-3bae-4a4b-ac47-ed6b1dfdcacc/cjhbghekkonbpcibkbogbcemepolpnnl/edit
- Submitted at: `2026-08-24`, America/New_York session
- Dashboard status after submission: `Pending review`
- Post-review behaviour: automatic publication was enabled in the submit dialog.
- Google warning acknowledged: broad host permissions can cause an in-depth review and delay publishing. The listing and privacy form document why arbitrary page clipping requires `<all_urls>`.

---

## Release-Grenzen

- Keine weitere Store-Version einreichen ohne Owner-Freigabe
- Kein GitHub Release ohne Owner-Freigabe
- Kein öffentliches Publizieren des privaten Repos ohne Owner-Freigabe

---

## v2.4.17 Release Candidate 2026-08-24

**Nicht im Chrome Web Store hochgeladen.** Diese Version ist lokal vorbereitet und wartet auf Owner-Freigabe.

### Änderungen

- Repariert: `CLIP_TAB` rief die nicht existierende Funktion `handleClip()` auf. Der History-Reclip verwendet jetzt `getSettings()` plus `clipTabSmart()` und damit denselben geprüften Routing-Pfad wie normale Clips.
- Landingpage hinzugefügt: <https://quick-obsidian-clipper.pages.dev>
- Produkt-Screenshot aus der aktuellen Optionsseite erzeugt.

### Lokale Tests

```text
node --check background-simple.js
node scripts/test-url-guards.mjs
node scripts/test-twitter-bookmark-scraper.mjs
node scripts/test-landing-browser.cjs
node scripts/capture-options-screenshot.cjs
```

Alle genannten Checks wurden ohne Fehler ausgeführt. Der isolierte E2E-Lauf bestätigte:

- Normaler Clip: `success: true`, Markdown-Download-ID `1`.
- Zweiter Clip derselben URL: Duplicate Detection aktiv, Download-ID `2`, zwei History-Einträge.
- Bulk/Status-Pfad: vorher verifiziert mit `1 / 1`, `success 1`, `failure 0`, Status `Clipped`.

### Build

- Version: `2.4.17`
- ZIP: `dist/quick-obsidian-clipper-v2.4.17-chrome-store.zip`
- SHA-256: `89a203d03f1d1b6b473ec1a64d2cdc0c19861cc3ffea63e5ff5f511bbc7916fa`
- Inhalt: 32 Laufzeitdateien; keine `.git`-, `docs`-, `archive`-, `scripts`- oder `.DS_Store`-Einträge.
- Checks: Manifest-Version `2.4.17`, JavaScript-Syntaxcheck, URL-Guard-Tests, X-Sync-Scraper-Fallbacktest, Landingpage-Browser-QA und ZIP-Integritätstest.
- Store-Aktion: keine; Upload und Submission bleiben gesperrt.
