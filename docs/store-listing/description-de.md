---
date: 2026-08-30
status: release-candidate-copy
lang: de
version: 2.4.18
---

# Quick Obsidian Clipper — Store-Beschreibung (Deutsch)

## Kurzbeschreibung (max. 132 Zeichen)

> Webseiten mit einem Klick als sauberes Markdown in deinen Downloads-Ordner speichern — bereit für Obsidian.

---

## Langbeschreibung (bis 16.000 Zeichen; Ziel ~500 Wörter)

**Quick Obsidian Clipper** speichert Webseiten als formatierte Markdown-Dateien direkt in deinen lokalen Downloads-Ordner. Kein Cloud-Sync, kein Konto, keine API-Keys — nur saubere Dateien, die du sofort in Obsidian oder jede andere Markdown-App importieren kannst.

### Warum lokale Ablage?

Die meisten Web-Clipper benötigen ein kostenpflichtiges Konto oder laden Inhalte in einen Cloud-Dienst hoch. Quick Obsidian Clipper schreibt direkt über die Download-API des Browsers in dein Dateisystem — ohne Zwischenschritt, sofort verfügbar.

### Kernfunktionen

**Ein-Klick-Clipping**
Klicke auf das Toolbar-Symbol oder drücke `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows), um die aktuelle Seite zu speichern. Die Extension extrahiert den Hauptinhalt, entfernt Tracking-Parameter und lädt eine saubere Markdown-Datei mit YAML-Frontmatter herunter (Titel, URL, Datum, Autor, Tags, Wortanzahl, Lesezeit).

**Auswahl-Clipping**
Text auf einer Seite markieren und `Cmd+Shift+C` drücken, um nur die Auswahl zu speichern — praktisch für Zitate, Code-Snippets oder einzelne Abschnitte.

**Alle Tabs auf einmal clipping**
`Cmd+Shift+A` drücken, um alle offenen Tabs im aktuellen Fenster in einem Durchgang zu speichern — ideal für Recherche-Sessions.

**Rechtsklick-Kontextmenü**
Bilder, Links oder markierten Text per Rechtsklick-Menü clipping, ohne das Popup zu öffnen.

**Duplikatserkennung**
Ein grünes Abzeichen auf dem Extension-Symbol zeigt bereits gespeicherte Seiten an. Vor dem erneuten Clipping erscheint eine Warnung, basierend auf URL-normiertem Vergleich (UTM-Parameter, fbclid und ähnliche Tracking-Fragmente werden vor dem Vergleich entfernt).

**Seitenspezifische Handler**

| Seite | Was extrahiert wird |
|---|---|
| YouTube | Videotitel, Beschreibung, Metadaten, Transkript (falls verfügbar) |
| Twitter/X | Tweet-Inhalt, Autor, Engagement-Zahlen, Antworten |
| Perplexity | AI-Suchergebnisse mit Quellenangaben |
| Medium | Artikeltext mit optionaler, nutzerinitiierter Freedium-Weiterleitung |
| Archivierte Seiten | Optionale, nutzerinitiierte Weiterleitung über archive.ph |

**Eigener Download-Pfad**
Einen Unterordner im Downloads-Verzeichnis des Browsers festlegen und den erkannten lokalen Speicherort direkt von der Optionsseite öffnen.

### Verwendete Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage` | Speichert Einstellungen und Clip-Verlauf lokal |
| `activeTab` | Liest den Inhalt der aktuellen Seite beim Clipping |
| `tabs` | Erkennt offene Tabs für Massen-Clipping |
| `scripting` | Injiziert den Inhalts-Extraktor in den aktiven Tab |
| `notifications` | Bestätigt, dass ein Clip gespeichert wurde |
| `downloads` | Speichert die Markdown-Datei im lokalen Dateisystem |
| `alarms` | Führt optional den geplanten X-Bookmark-Sync und wartende Wiederholungen aus |
| `contextMenus` | Fügt Rechtsklick-Optionen für Bilder, Links und Auswahlen hinzu |
| `<all_urls>` | Erforderlich, damit der Inhalts-Extraktor auf jeder geclippten Seite laufen kann |

### Lokale Verarbeitung

Die Extension lädt Clips, Verlauf oder Einstellungen nicht zum Entwickler hoch. Extraktion und Markdown-Erstellung finden im Browser statt. Der optionale X-Bookmark-Sync öffnet x.com in deiner angemeldeten Browser-Sitzung. Optionale Weiterleitungen zu archive.ph und Freedium kontaktieren diese unabhängigen Dienste nur, wenn du die Funktion aktivierst oder auslöst.

---

*Kein Konto erforderlich. Kein Abonnement. Dateien gehen in deinen Downloads-Ordner.*
