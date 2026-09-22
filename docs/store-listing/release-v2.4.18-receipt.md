---
date: 2026-09-22
version: 2.4.18
status: local-and-comet-verified-store-draft-uploaded-review-pending
---

# Quick Obsidian Clipper 2.4.18 – Release-Receipt

## Änderung

- Der X-Handler versucht nach einem entfernten Hauptframe einmal erneut, die tatsächlich gepackte Datei zu laden.
- Ein geschlossener Tab wird kontrolliert abgebrochen. Der frühere Fallback auf eine nicht vorhandene Datei im Extension-Root entfällt.
- Regressionstest: `scripts/test-twitter-injection.cjs`.

## Lokale Verifikation

- Manifest und Options-Footer: `2.4.18`.
- Comet: bestehende entpackte Extension am bisherigen Pfad neu geladen; Version `2.4.18`, Extension-ID unverändert. Vor dem Austausch wurden nur die 29 Laufzeitdateien gesichert. Keine Browser-Storage-Daten wurden kopiert oder zurückgesetzt.
- X-Injektion und X-Bookmark-Scraper: Tests bestanden.
- Im isolierten Chromium mit dem frisch gebauten Paket: History-Reclip- und Options-Runtime-Tests bestanden.
- Store-Screenshot: `1280×800`, Hauptaktionen sichtbar; Promo-Tile: `440×280`, sichtbares `v2.4.18`.
- Landing-Browser-QA: öffentliche Store-Version `2.4.17`, manuelle Version `2.4.18` in Englisch und Deutsch korrekt.
- Reproduzierbares ZIP: `dist/quick-obsidian-clipper-v2.4.18-chrome-store.zip`, 29 Dateien, keine verbotenen Einträge, Payload identisch zum frischen Staging.
- ZIP-SHA-256: `2e6f45ce2fffccdc4c603ebae0377345a3e47e0ee48d18b41cf9c2bc5752e104`.

## Externer Status und offene Grenzen

- Öffentliche Store-Version bei der letzten Read-only-Prüfung: `2.4.17`.
- Store-Dashboard: Paket-Upload bestätigt. **Draft `2.4.18`**, Published `2.4.17`; Review-Submission und Publikation noch nicht erfolgt.
- Die Google-Passkey-Bestätigung wurde vom Kontoinhaber im internen Browser abgeschlossen; keine Anmeldedaten wurden gelesen oder gespeichert.
- Öffentliche Privacy Policy unter der im Store hinterlegten GitHub-Pages-URL: HTTP 200, aber noch Stand `2026-08-23` ohne X-Bookmark-Sync-Offenlegung. Vor einer Review-Submission aktualisieren.
- Kein Live-E2E mit einer eingeloggten X-Bookmark-Sitzung behauptet; die Regression wurde deterministisch mit Chrome-API-Mocks getestet.

Store-Listing: <https://chromewebstore.google.com/detail/quick-obsidian-clipper/cjhbghekkonbpcibkbogbcemepolpnnl>
