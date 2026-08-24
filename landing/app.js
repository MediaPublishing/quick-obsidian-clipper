(() => {
  const translations = {
    en: {
      "meta.title": "Quick Obsidian Clipper - Save web pages as clean Markdown",
      "meta.description": "Quick Obsidian Clipper turns any page into clean local Markdown with YAML frontmatter, duplicate detection, bulk clipping and optional X bookmark sync.",
      "nav.install": "Install",
      "nav.features": "Features",
      "nav.source": "Source",
      "hero.eyebrow": "Capture. Normalize. Sync.",
      "hero.title": "Save any web page straight into Obsidian.",
      "hero.sub": "Quick Obsidian Clipper writes clean Markdown to your Downloads folder. No cloud account, no API keys, no content leaving your browser.",
      "hero.ctaPrimary": "Install the extension",
      "hero.ctaSecondary": "See the workflow",
      "hero.microcopy": "Version 2.4.16 · Chrome Web Store review pending · manual install is available today.",
      "surface.label": "Clip preview",
      "surface.status": "Saved locally",
      "surface.file": "2026-08-24--research-article.md",
      "surface.frontmatter": "Frontmatter",
      "surface.body": "Article content",
      "sampleCode": "---\ntitle: \"Research Article\"\nurl: \"https://example.com/research-article\"\ndate_saved: 2026-08-24\ntype: article\nword_count: 1240\nreading_time: 6\ntags:\n  - clipping/web\n  - to-process\n---\n\n# Research Article\n\nThe extracted body stays clean and readable.\n",
      "steps.title": "Start in three steps",
      "steps.sub": "The clip lands as a Markdown file first. Your folder sync or a manual move brings it into Obsidian.",
      "steps.one.num": "Step 01",
      "steps.one.title": "Load the extension",
      "steps.one.body": "Use the Chrome Web Store when review completes, or load the repository folder unpacked in Chrome, Brave, Arc or Edge.",
      "steps.two.num": "Step 02",
      "steps.two.title": "Choose your subfolder",
      "steps.two.body": "Keep Obsidian-Clips or set a relative path below Downloads. Browser extensions cannot write to arbitrary absolute paths.",
      "steps.three.num": "Step 03",
      "steps.three.title": "Clip and move into Obsidian",
      "steps.three.body": "Clip with one click or a shortcut. Then let your folder sync move the file into your vault, or move it yourself.",
      "steps.one.detail": "Download or clone the repository, open the extensions page, enable Developer mode and select the project root.",
      "steps.two.detail": "The Options page shows whether the folder was detected after your first clip.",
      "steps.three.detail": "X bookmark IDs stay valid even after the generated files move inside the vault.",
      "features.title": "Built for real research sessions",
      "features.sub": "One small extension covers capture, cleanup, history and recurring X bookmarks without a hosted service.",
      "screenshots.title": "See the extension",
      "screenshots.sub": "The options view keeps storage, health metrics and X bookmark controls in one place.",
      "screenshots.product": "Quick Obsidian Clipper · Options",
      "screenshots.caption": "Options · download folder, health metrics, sync status and X bookmark controls.",
      "screenshots.open": "Open full-size view",
      "workflow.title": "From browser tab to vault note",
      "workflow.sub": "Each stage stays inspectable: the source URL, the generated Markdown and the final location in your vault.",
      "privacy.title": "Local-first by default",
      "privacy.lede": "Page extraction happens in your browser. The result is written through the download system. There is no analytics layer and no developer-side copy of your clips.",
      "privacy.kicker": "Local-first by design",
      "install.title": "Two installation paths",
      "install.sub": "Use the store version for normal updates. Use unpacked install while review is still pending.",
      "faq.title": "Questions before installing",
      "repo.title": "Source code and privacy policy",
      "repo.cta": "Open GitHub repository",
      "footer.tagline": "Quick Obsidian Clipper · A local Markdown bridge from the web to Obsidian",
      "footer.privacy": "Privacy policy"
    },
    de: {
      "meta.title": "Quick Obsidian Clipper - Webseiten als sauberes Markdown speichern",
      "meta.description": "Quick Obsidian Clipper macht aus Webseiten sauberes lokales Markdown mit YAML-Frontmatter, Duplikatserkennung, Bulk-Clipping und optionaler X-Bookmark-Synchronisation.",
      "nav.install": "Installieren",
      "nav.features": "Features",
      "nav.source": "Source",
      "hero.eyebrow": "Erfassen. Bereinigen. Synchronisieren.",
      "hero.title": "Speichere jede Webseite direkt für Obsidian.",
      "hero.sub": "Quick Obsidian Clipper schreibt sauberes Markdown in deinen Downloads-Ordner. Kein Cloud-Konto, keine API-Keys und deine Inhalte verlassen den Browser nicht.",
      "hero.ctaPrimary": "Extension installieren",
      "hero.ctaSecondary": "Workflow ansehen",
      "hero.microcopy": "Version 2.4.16 · Chrome Web Store Prüfung läuft · manuelle Installation ist heute verfügbar.",
      "surface.label": "Clip-Vorschau",
      "surface.status": "Lokal gespeichert",
      "surface.file": "2026-08-24--research-article.md",
      "surface.frontmatter": "Frontmatter",
      "surface.body": "Artikelinhalt",
      "sampleCode": "---\ntitle: \"Research Article\"\nurl: \"https://example.com/research-article\"\ndate_saved: 2026-08-24\ntype: article\nword_count: 1240\nreading_time: 6\ntags:\n  - clipping/web\n  - to-process\n---\n\n# Research Article\n\nDer extrahierte Inhalt bleibt sauber und lesbar.\n",
      "steps.title": "Start in drei Schritten",
      "steps.sub": "Der Clip landet zuerst als Markdown-Datei. Dein Ordner-Sync oder ein manueller Move bringt ihn nach Obsidian.",
      "steps.one.num": "Schritt 01",
      "steps.one.title": "Extension laden",
      "steps.one.body": "Nutze den Chrome Web Store, sobald die Prüfung abgeschlossen ist, oder lade den Repository-Ordner in Chrome, Brave, Arc oder Edge unpacked.",
      "steps.two.num": "Schritt 02",
      "steps.two.title": "Unterordner wählen",
      "steps.two.body": "Behalte Obsidian-Clips oder setze einen relativen Pfad unter Downloads. Extensions können nicht in beliebige absolute Pfade schreiben.",
      "steps.three.num": "Schritt 03",
      "steps.three.title": "Clippen und nach Obsidian bringen",
      "steps.three.body": "Clippe per Klick oder Shortcut. Danach verschiebt dein Folder-Sync die Datei in den Vault, oder du verschiebst sie selbst.",
      "steps.one.detail": "Lade oder klone das Repository, öffne die Extensions-Seite, aktiviere den Developer Mode und wähle das Projekt-Root.",
      "steps.two.detail": "Die Optionsseite zeigt nach dem ersten Clip, ob der Ordner erkannt wurde.",
      "steps.three.detail": "X-Bookmark-IDs bleiben gültig, auch wenn die erzeugten Dateien im Vault verschoben werden.",
      "features.title": "Für echte Research-Sessions gebaut",
      "features.sub": "Eine kleine Extension deckt Erfassen, Aufräumen, History und wiederkehrende X-Bookmarks ohne gehosteten Dienst ab.",
      "screenshots.title": "Die Extension ansehen",
      "screenshots.sub": "Die Optionsansicht hält Ablage, Health-Metrics und X-Bookmark-Steuerung an einem Ort zusammen.",
      "screenshots.product": "Quick Obsidian Clipper · Optionen",
      "screenshots.caption": "Optionen · Download-Ordner, Health-Metrics, Sync-Status und X-Bookmark-Steuerung.",
      "screenshots.open": "Volle Größe öffnen",
      "workflow.title": "Vom Browser-Tab zur Vault-Notiz",
      "workflow.sub": "Jede Stufe bleibt prüfbar: Quell-URL, erzeugtes Markdown und der endgültige Ort im Vault.",
      "privacy.title": "Local-first als Standard",
      "privacy.lede": "Die Extraktion passiert im Browser. Das Ergebnis wird über das Download-System geschrieben. Es gibt keine Analytics-Schicht und keine Entwicklerkopie deiner Clips.",
      "privacy.kicker": "Local-first als Standard",
      "install.title": "Zwei Installationswege",
      "install.sub": "Nutze die Store-Version für normale Updates. Nutze die unpacked Installation, während die Review läuft.",
      "faq.title": "Fragen vor der Installation",
      "repo.title": "Source Code und Datenschutz",
      "repo.cta": "GitHub-Repository öffnen",
      "footer.tagline": "Quick Obsidian Clipper · Eine lokale Markdown-Brücke vom Web zu Obsidian",
      "footer.privacy": "Datenschutz"
    }
  };

  const staticContent = {
    en: {
      featureCards: [
        { title: "One click and shortcuts", body: "Clip the active page with the toolbar icon, Cmd+Shift+S or Ctrl+Shift+S." },
        { title: "Selection clipping", body: "Press Cmd+Shift+C to save only the selected quote, snippet or section." },
        { title: "Bulk research tabs", body: "Send every valid tab in a window through one controlled clipping pass." },
        { title: "Duplicate detection", body: "Normalize tracking parameters and warn before saving the same URL again." },
        { title: "Site-aware output", body: "Special handling keeps YouTube, X posts, Perplexity results and Medium articles readable." },
        { title: "X bookmark sync", body: "Turn bookmarked X posts into individual Markdown files on your schedule." }
      ],
      workflowCards: [
        { label: "Browser", title: "Read and select", body: "Open any normal HTTP or HTTPS page. Internal browser pages are blocked by explicit URL guards.", code: "https://example.com/research-article" },
        { label: "Markdown", title: "Inspectable output", body: "YAML frontmatter captures title, source, date, tags, word count and reading time.", code: "title: \"Research Article\"\nurl: \"https://example.com/research-article\"\ntype: article\ntags:\n  - clipping/web" },
        { label: "Obsidian", title: "Move into your vault", body: "Use iCloud, Dropbox, Syncthing or another local process to deliver the file to your chosen vault folder.", code: "Downloads/Obsidian-Clips/ → Vault/Clippings/" }
      ],
      privacyPoints: [
        "No account, subscription or API key required",
        "No telemetry and no external content transfer",
        "Settings, history and X sync IDs stay in local storage",
        "Optional archive routes run only after you enable them"
      ],
      stats: [
        { value: "3", label: "capture modes: page, selection and bulk tabs" },
        { value: "100%", label: "local processing before the file reaches disk" }
      ],
      installCards: [
        { kicker: "Recommended after review", title: "Chrome Web Store", body: "The submitted package uses Manifest V3, explicit permission justifications and automatic publication after approval.", cta: "Open store listing", href: "https://chromewebstore.google.com/detail/cjhbghekkonbpcibkbogbcemepolpnnl", status: "Pending review" },
        { kicker: "Available now", title: "Manual unpacked install", body: "Clone the repository, enable Developer mode in your Chromium browser and load the project root.", cta: "Installation guide", href: "https://github.com/MediaPublishing/quick-obsidian-clipper#installation", status: "Version 2.4.16" }
      ],
      faqs: [
        { q: "Does it upload my articles anywhere?", a: "No. Extraction and Markdown creation happen locally. The browser download API writes the finished file to disk." },
        { q: "Where do files actually go?", a: "They go below your browser's Downloads directory, by default in Obsidian-Clips. The Options page includes a one-click action to reveal that folder." },
        { q: "How does X Bookmark Sync work?", a: "When enabled, it checks your logged-in X bookmarks on the selected interval. Already-synced post IDs are stored locally so moved files are not synced twice." },
        { q: "Can I use Brave, Arc or Edge?", a: "Yes. Manual unpacked installation works in Chromium browsers that support Manifest V3 extensions." },
        { q: "Why does the extension request broad site access?", a: "A general web clipper must work on the page you choose. Bulk clipping also needs URL information for tabs that are already open." },
        { q: "Is there a paid tier?", a: "No. The extension is free and has no account requirement." }
      ]
    },
    de: {
      stepsOneDetail: "Lade oder klone das Repository, öffne die Extensions-Seite, aktiviere den Developer Mode und wähle das Projekt-Root.",
      featureCards: [
        { title: "Ein Klick und Shortcuts", body: "Clippe die aktive Seite über das Toolbar-Symbol, Cmd+Shift+S oder Ctrl+Shift+S." },
        { title: "Auswahl clippen", body: "Drücke Cmd+Shift+C, um nur Zitat, Snippet oder Abschnitt zu speichern." },
        { title: "Bulk-Research-Tabs", body: "Schicke alle gültigen Tabs eines Fensters in einem kontrollierten Durchgang durchs Clipping." },
        { title: "Duplikatserkennung", body: "Entferne Tracking-Parameter und warne vor dem erneuten Speichern derselben URL." },
        { title: "Seitenspezifischer Output", body: "Spezielle Handler halten YouTube, X-Posts, Perplexity-Ergebnisse und Medium-Artikel lesbar." },
        { title: "X-Bookmark-Sync", body: "Wandle gebookmarkte X-Posts nach Zeitplan in einzelne Markdown-Dateien." }
      ],
      workflowCards: [
        { label: "Browser", title: "Lesen und markieren", body: "Öffne eine normale HTTP- oder HTTPS-Seite. Browser-interne Seiten blockieren explizite URL-Guards.", code: "https://example.com/research-article" },
        { label: "Markdown", title: "Prüfbarer Output", body: "YAML-Frontmatter sichert Titel, Quelle, Datum, Tags, Wortanzahl und Lesezeit.", code: "title: \"Research Article\"\nurl: \"https://example.com/research-article\"\ntype: article\ntags:\n  - clipping/web" },
        { label: "Obsidian", title: "In den Vault bringen", body: "Nutze iCloud, Dropbox, Syncthing oder einen anderen lokalen Prozess für den Zielordner im Vault.", code: "Downloads/Obsidian-Clips/ → Vault/Clippings/" }
      ],
      privacyPoints: [
        "Kein Konto, kein Abo und kein API-Key nötig",
        "Keine Telemetrie und kein externer Content-Transfer",
        "Einstellungen, History und X-Sync-IDs bleiben lokal",
        "Optionale Archive-Routen laufen erst nach Aktivierung"
      ],
      stats: [
        { value: "3", label: "Capture-Modi: Seite, Auswahl und Bulk-Tabs" },
        { value: "100%", label: "lokale Verarbeitung, bevor die Datei auf die Platte kommt" }
      ],
      installCards: [
        { kicker: "Empfohlen nach Review", title: "Chrome Web Store", body: "Das eingereichte Paket nutzt Manifest V3, explizite Permission-Begründungen und automatische Veröffentlichung nach Freigabe.", cta: "Store-Listing öffnen", href: "https://chromewebstore.google.com/detail/cjhbghekkonbpcibkbogbcemepolpnnl", status: "Review läuft" },
        { kicker: "Jetzt verfügbar", title: "Manuelle unpacked Installation", body: "Klone das Repository, aktiviere den Developer Mode im Chromium-Browser und lade das Projekt-Root.", cta: "Installationsanleitung", href: "https://github.com/MediaPublishing/quick-obsidian-clipper#installation", status: "Version 2.4.16" }
      ],
      faqs: [
        { q: "Werden Artikel irgendwo hochgeladen?", a: "Nein. Extraktion und Markdown-Erzeugung laufen lokal. Die Download-API des Browsers schreibt die fertige Datei auf die Platte." },
        { q: "Wo landen die Dateien genau?", a: "Sie liegen unter dem Downloads-Ordner des Browsers, standardmässig in Obsidian-Clips. Die Optionsseite hat einen Ein-Klick-Pfad zum Ordner." },
        { q: "Wie funktioniert der X-Bookmark-Sync?", a: "Nach Aktivierung prüft er deine eingeloggten X-Bookmarks im gewählten Intervall. Gespeicherte Post-IDs bleiben lokal, damit verschobene Dateien nicht doppelt synchronisiert werden." },
        { q: "Funktioniert das in Brave, Arc oder Edge?", a: "Ja. Die manuelle unpacked Installation funktioniert in Chromium-Browsern mit Manifest-V3-Support." },
        { q: "Warum braucht die Extension breiten Seitenzugriff?", a: "Ein allgemeiner Web Clipper muss auf der gewählten Seite arbeiten. Bulk-Clipping braucht zusätzlich URL-Informationen zu bereits offenen Tabs." },
        { q: "Gibt es eine kostenpflichtige Variante?", a: "Nein. Die Extension ist kostenlos und benötigt kein Konto." }
      ]
    }
  };

  const metaDescription = document.querySelector('meta[name="description"]');
  const languageButtons = [...document.querySelectorAll('[data-lang-choice]')];

  function t(lang, key) {
    return translations[lang][key] || translations.en[key] || "";
  }

  function getInitialLanguage() {
    const saved = window.localStorage.getItem("qoc-language");
    if (saved === "en" || saved === "de") return saved;
    return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
  }

  function renderStatic(lang) {
    document.querySelectorAll('[data-static]').forEach(element => {
      const [group, index] = element.dataset.static.split(".");
      const item = staticContent[lang][group];
      if (typeof item === "string") element.textContent = item;
      if (Array.isArray(item) && item[index]) {
        if (element.dataset.field) element.textContent = item[index][element.dataset.field] || "";
        else if (element.tagName === "LI") element.textContent = item[index];
      }
    });
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.title = t(lang, "meta.title");
    metaDescription?.setAttribute("content", t(lang, "meta.description"));

    document.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = t(lang, element.dataset.i18n);
    });

    languageButtons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.langChoice === lang));
    });

    window.localStorage.setItem("qoc-language", lang);
  }

  languageButtons.forEach(button => {
    button.addEventListener("click", () => applyLanguage(button.dataset.langChoice));
  });

  applyLanguage(getInitialLanguage());
  renderStatic(getInitialLanguage());
})();
