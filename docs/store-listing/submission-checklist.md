---
date: 2026-06-11
status: draft
---

# Quick Obsidian Clipper — Submission Checklist

> DRAFT — Kein Upload, kein Publish. Alle Punkte müssen manuell bestätigt werden.

---

## ⛔ BLOCKER-SEKTION: P0-Issues vor Submission

### P0-1: `<all_urls>` Permission — Store-Reviewer-Risiko

**Was es ist:** Das Manifest deklariert `"host_permissions": ["<all_urls>"]`. Chrome Web Store verlangt seit den Policy-Updates 2024/2025 eine explizite Rechtfertigung für `<all_urls>`. Extensions mit `<all_urls>` ohne klar erkennbaren Grund werden häufiger abgelehnt oder in der manuellen Review verzögert.

**Technischer Grund für `<all_urls>`:** Nutzer können jede beliebige Seite clipping. Die Extension muss auf dem Tab des Nutzers laufen — nicht auf einer vordefinierten Whitelist.

**Zu tun:**
1. In der Store-Listing-Beschreibung explizit erklären, warum `<all_urls>` nötig ist (bereits in `description-en.md` und `privacy-policy.md` enthalten).
2. Im "Single Purpose"-Feld des Store-Formulars den Zweck klar benennen: "Clips any web page to Markdown files in the user's local Downloads folder."
3. Überprüfen, ob `web_accessible_resources` auf `<all_urls>` eingeschränkt werden kann (aktuell offen) — reduziert Angriffsfläche und zeigt Store-Reviewer gute Praxis.

**Status:** OFFENE PRÜFUNG — Listing-Text justiert, technische Review der `web_accessible_resources` empfohlen

---

### P0-2: Keine Privacy Policy URL

**Was fehlt:** Store erfordert eine öffentlich erreichbare Privacy Policy URL. Die Policy existiert als `docs/store-listing/privacy-policy.md`, ist aber nicht deployed.

**Zu tun:**
1. Privacy Policy auf einer öffentlichen URL hosten (GitHub Pages über öffentliches Repo, eigene Domain, oder ein anderer statischer Host).
2. URL im Chrome-Web-Store-Entwicklerprofil eintragen.

**Status:** OFFEN

---

### P0-3: Webhook-Server-Funktionalität — Feature-Status prüfen

**Was unklar ist:** Laut OPEN-LOOPS-Dokument war ein "Webhook-Server-Test" der letzte offene Schritt. Im Code (`background-simple.js`, `content.js`) ist kein aktiver Webhook-Server-Aufruf sichtbar. Die `web_accessible_resources`-Sektion im Manifest exponiert `src/handlers/*.js` — diese Handler müssen einzeln geprüft werden.

**Zu tun:**
1. `ls /Users/MediaPublishing/Projects/quick-obsidian-clipper/src/handlers/` ausführen und alle Handler-Dateien prüfen.
2. Verifizieren, dass kein Handler eine externe Server-URL aufruft (nur lokale Downloads und optionale user-initiated Weiterleitungen zu archive.ph/freedium sind erlaubt).

**Status:** PRÜFUNG AUSSTEHEND

---

### P0-4: End-to-End-Test auf realen Seiten

**Was fehlt:** Kein dokumentierter E2E-Test der Extension nach dem letzten Sync-Bug-Fix (`040b7ab`).

**Zu tun:**
1. Extension unpacked laden (Repo-Root, nicht ein Subfolder).
2. Normalen Artikel clipping — Markdown in Downloads-Ordner prüfen.
3. YouTube-Video clipping — Transcript vorhanden?
4. Bulk-Clip 3 Tabs — Status-Seite korrekt?
5. Duplicate Detection: Dieselbe Seite zweimal clipping — Warnung erscheint?

**Status:** OFFEN

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
- [x] `web_accessible_resources` auf spezifische Dateien beschränkt (nicht `*`)
- [ ] `web_accessible_resources` `matches: ["<all_urls>"]` — kann auf spezifische Seiten eingeschränkt werden? PRÜFEN
- [x] Tastatur-Shortcuts definiert (3 Commands)
- [ ] Alle Icons vorhanden und geprüft (16, 32, 48, 128 px) — AUSSTEHEND

---

## Store-Listing-Checkliste

- [x] Kurzbeschreibung (EN) geschrieben — `description-en.md`
- [x] Langbeschreibung (EN) geschrieben — `description-en.md`
- [x] Kurzbeschreibung (DE) geschrieben — `description-de.md`
- [x] Langbeschreibung (DE) geschrieben — `description-de.md`
- [x] Privacy Policy (Markdown) geschrieben — `privacy-policy.md`
- [ ] Privacy Policy öffentlich hosted — OFFEN (P0-2)
- [x] Screenshot-Konzept (5 Motive) — `screenshots-konzept.md`
- [ ] Screenshots produziert — OFFEN
- [ ] Promotional Tile (440×280) — OPTIONAL, OFFEN

---

## Pre-Upload-Checkliste

- [ ] P0-1 (all_urls Begründung + web_accessible_resources Review)
- [ ] P0-2 (Privacy Policy URL live)
- [ ] P0-3 (Handlers geprüft — kein externer Aufruf ohne User-Aktion)
- [ ] P0-4 (E2E-Test bestanden)
- [ ] Store-Entwicklerprofil angelegt ($5 Registrierungsgebühr)
- [ ] Privacy Policy URL im Profil eingetragen
- [ ] Extension ZIP erstellt (`zip -r quick-obsidian-clipper.zip . --exclude "*.git*" --exclude "docs/*" --exclude "archive/*" --exclude "scripts/*"`)
- [ ] ZIP-Inhalt geprüft (kein .git, kein docs/, keine Backup-Dateien)
- [ ] Listing-Text (EN) eingetragen
- [ ] Screenshots hochgeladen
- [ ] Store-interne Überprüfung abgewartet

---

## Was NICHT getan werden darf (vor explizitem GO)

- Kein Upload auf den Chrome Web Store
- Kein GitHub Release
- Kein öffentliches Publizieren des privaten Repos (falls noch private)
