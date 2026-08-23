#!/usr/bin/env bash
set -euo pipefail

version=$(node -p 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8")).version')
build_root="dist"
package_name="quick-obsidian-clipper-v${version}-chrome-store.zip"

mkdir -p "${build_root}"
rm -rf "${build_root}/chrome-store-staging" # generated artifact only
staging="${build_root}/chrome-store-staging"

mkdir -p \
  "${staging}/icons" \
  "${staging}/src/handlers"

cp manifest.json LICENSE README.md background-simple.js content.js perplexity-content.js rate-limiter.js \
  bulk-clip-status.html bulk-clip-status.js history.html history.js options.html options-redesigned.html \
  options.css options.js perplexity-popup.html perplexity-popup.js "${staging}/"

cp icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png "${staging}/icons/"
cp src/url-guards.js "${staging}/src/"
cp src/handlers/*.js "${staging}/src/handlers/"

(cd "${staging}" && zip -qr "../${package_name}" .)

echo "dist/${package_name}"
