#!/usr/bin/env bash
set -euo pipefail

version=$(node -p 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8")).version')
build_root="dist"
package_name="quick-obsidian-clipper-v${version}-chrome-store.zip"

mkdir -p "${build_root}"
rm -rf "${build_root}/chrome-store-staging" # generated artifact only
staging="${build_root}/chrome-store-staging"
package_path="${build_root}/${package_name}"

mkdir -p \
  "${staging}/icons" \
  "${staging}/src/handlers"

cp manifest.json LICENSE README.md background-simple.js content.js perplexity-content.js rate-limiter.js \
  bulk-clip-status.html bulk-clip-status.js history.html history.js options.html options-redesigned.html \
  options.css options.js perplexity-popup.html perplexity-popup.js "${staging}/"

cp icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png "${staging}/icons/"
cp src/url-guards.js "${staging}/src/"
cp src/handlers/*.js "${staging}/src/handlers/"

# ZIP timestamps and entry order must not depend on the build time or filesystem.
# This keeps the Chrome Web Store package byte-for-byte reproducible.
find "${staging}" -exec env TZ=UTC touch -t 200001010000.00 {} +
rm -f "${package_path}" # generated artifact only
(cd "${staging}" && find . -type f -print | LC_ALL=C sort | zip -X -q "../${package_name}" -@)

echo "${package_path}"
