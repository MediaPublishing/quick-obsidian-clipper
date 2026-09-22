---
date: 2026-09-22
version: 2.4.17
status: local-fix-verified-new-store-version-required
---

# Quick Obsidian Clipper 2.4.17 - Release Candidate Receipt

## Scope

- Local branch: `release/qoc-v2.4.17-rc`
- Base commit: `8d154fe7c3bb474ec154869c59ce8cd4ae78bb77`
- Manifest: `2.4.17`
- Store item: `cjhbghekkonbpcibkbogbcemepolpnnl`
- External mutations in this run: none
- Store upload/submission: none
- Git commit/push/PR: none
- Cloudflare/GitHub Pages deployment: none
- Login, OAuth, cookies, secrets or private X data used: none

## Verification result

| Check | Result | Evidence |
|---|---|---|
| JavaScript syntax | PASS | Extension runtime and changed test scripts parsed without errors. |
| URL guards | PASS | Browser-internal URLs blocked; normal HTTP URL allowed. |
| X bookmark scraper | PASS | Fallback selector test passed. |
| X handler injection | PASS | A removed frame retries the packaged handler; closed tabs abort without the nonexistent file fallback. |
| History re-clip | PASS | Internal URL blocked, imported markup safe, normal URL opened. |
| Options runtime | PASS | Automatic refresh, actions, download-folder click, sync failure, health metrics and X counters verified. |
| Packaged extension runtime | PASS | History and Options tests ran with `QOC_EXTENSION_ROOT=dist/chrome-store-staging`. |
| Landing browser QA | PASS | English/German, Store/manual version `2.4.17`, screenshot `1425x2393`. |
| Store screenshot capture | PASS | Current extension footer `v2.4.17`; primary actions visible inside `1280x800`. |
| Promo tile | PASS | `440x280`; visible version sentinel `v2.4.17`. |
| Screenshot freshness | PASS | Capture manifest binds current render-source hashes, image hashes, viewport and version sentinels. |
| ZIP integrity | PASS | 29 runtime files; no `.git`, `docs`, `archive`, `scripts`, `.env` or `.DS_Store` entries. |
| ZIP payload fidelity | PASS | Every archive entry matches the freshly built staging file byte-for-byte. |
| Reproducible build | PASS | Two consecutive builds produced the identical SHA-256 below. |
| Public Store readback | PASS | Read-only check on 2026-09-22: HTTP 200, public version `2.4.17`, updated `August 29, 2026`. The new local fix is not included. |
| Public landing availability | PASS with drift | HTTP 200 and security headers passed; deployed copy still names Store `2.4.16`. Local source is corrected to `2.4.17` but not deployed in this run. |
| Public Privacy Policy | FOLLOW-UP | Public copy still shows `Last updated: 2026-08-23`. Local 2.4.17 policy now discloses X sync and both Freedium domains but was not deployed in this run. |

## Release package

- Path: `dist/quick-obsidian-clipper-v2.4.17-chrome-store.zip`
- SHA-256: `a3527cf5158dd5de24f0c82cf44bb07fad6026d3f4e61527a319d0a712197262`
- Runtime files: `29`
- Rebuild 1: `a3527cf5158dd5de24f0c82cf44bb07fad6026d3f4e61527a319d0a712197262`
- Rebuild 2: `a3527cf5158dd5de24f0c82cf44bb07fad6026d3f4e61527a319d0a712197262`
- Hash match: yes

## Store assets

| Asset | Dimensions | SHA-256 |
|---|---:|---|
| `screenshot-01-options-1280x800.png` | 1280x800 | `1622a09d155496e75d13eeff15c8b6d6617f26e62e00337b48e1f0d4b252b0e2` |
| `screenshot-01-options-1280x800.jpg` | 1280x800 | `f7b07ab73d045de802aec090718479f17220426f026280cb66de3f98fbe8c845` |
| `promo-tile-440x280.png` | 440x280 | `1c74c37cde93d267232555772a8911c478db8f34aab5c35ab916f8fda7f190ff` |
| `promo-tile-440x280.jpg` | 440x280 | `a4a1f03e4af033799cfb69706e9b597afc551c62107726a56fb4f6b8dac22a0b` |

Capture manifest: `docs/store-listing/assets/capture-manifest-v2.4.17.json`

Capture manifest SHA-256: `37b505fc81c865c7efaa9c4d3a6d717c5b926638aab4defb7da9df1c6fd613d3`

## Store status

The public Chrome Web Store page was read without authentication again on 2026-09-22. It returned HTTP 200 and displayed:

- Version: `2.4.17`
- Updated: `August 29, 2026`
- Listing: <https://chromewebstore.google.com/detail/quick-obsidian-clipper/cjhbghekkonbpcibkbogbcemepolpnnl>

This proves the extension is public. It does not prove that the local Landing or Privacy Policy copy has been deployed.

## X bookmark sync boundary

The deterministic scraper fallback and Options runtime tests passed. No authenticated live X bookmark session was opened because this RC run explicitly excludes login state, cookies and private user data. Live X DOM changes therefore remain a post-release compatibility risk, not a hidden green assertion.

## Review result

The independent local review covered correctness, project standards, testing fidelity and adversarial false-green scenarios. The initial findings led to these additional guards:

- version-aware public Store check;
- two-build reproducibility assertion;
- byte-for-byte ZIP-to-staging comparison;
- packaged-extension browser tests;
- actual `1280x800` action visibility assertion;
- promo version sentinel;
- landing screenshot dimension assertion;
- explicit screenshot hashes in this receipt.

The optional external cross-model review did not run because diff egress was not approved. The local adversarial fallback covered that lens. Seven semantically distinct findings were fixed or disproved; an independent validator confirmed that no actionable finding remains.

## Post-Deploy Monitoring & Validation

Owner: Media Publishing. Validation window: immediately after a separately approved Landing/Privacy deployment and again after 24 hours.

- Landing healthy signal: `https://quick-obsidian-clipper.pages.dev/app.js` contains Store version `2.4.17`; `scripts/check-landing-url.mjs` returns HTTP 200 and all required assets return 200.
- Privacy healthy signal: public policy shows `Last updated: 2026-08-30` and includes the optional X bookmark sync disclosure.
- Store healthy signal: `scripts/check-store-url.mjs` returns `publishedVersion: 2.4.17` and HTTP 200.
- Failure signal: any public surface shows `2.4.16`, omits the X sync disclosure, returns non-200, or emits browser console errors.
- Mitigation: stop the deployment, retain the current public version, correct the static source, rerun local browser QA, then redeploy only with separate approval.

## Final disposition

Local code, regression test and release-package integrity: verified. The new X-handler fix is **not** in the already-published 2.4.17 Store version. The rebuilt 2.4.17 ZIP differs from the previously recorded ZIP, so it must not be submitted as an update under the same version number. A future Store update needs a fresh manifest version, consistent listing/assets and a new submission receipt.

External follow-up still requiring separate approval: deploy the corrected Landing and Privacy Policy. No external action was taken by this run.

## X handler incident follow-up (2026-09-22)

- User-reported console errors: main frame removed during X handler injection, followed by a failed attempt to load `twitter-handler.js` at the extension root, then `No tab with id`.
- Root cause: the old fallback treated every injection error as a missing file. A navigation/closed-tab race therefore triggered a fallback path not present in the package and then another injection into a tab that no longer existed.
- Fix: retry `src/handlers/twitter-handler.js` once after a frame replacement; abort on a closed tab; never try the nonexistent root-level file.
- Regression proof: `node scripts/test-twitter-injection.cjs` passed for frame replacement, closed tab, missing packaged handler and a second frame replacement. The first run against the old code failed because it attempted `twitter-handler.js` instead of retrying the packaged path.
- Browser proof: packaged-extension History and Options runtime tests plus Landing browser QA passed in an isolated Playwright Chromium profile. Release candidate verifier and ZIP integrity passed.
- Boundary: no signed-in live X bookmark session was used, so a real X site E2E result is not claimed. No Store upload, deployment or GitHub write occurred.
