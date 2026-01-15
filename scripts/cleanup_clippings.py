#!/usr/bin/env python3
"""
Smart cleanup tool for legacy Obsidian clippings.

Usage:
  python scripts/cleanup_clippings.py

The script updates clipped notes under My Drive/.../Knowledge/Clippings by:
  * Adding clip_kind metadata and helpful tags (bookmark, news, repo, video).
  * Flagging low-value clips (Untitled/login gate) with `needs_reclip: true`.
  * Normalizing tags (e.g., adds clipping/web).
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

import yaml

BASE = Path("/Users/MediaPublishing/My Drive (webonomy@gmail.com)/!Vault/Knowledge/Clippings")
SINCE = datetime(2025, 12, 15)
NEWS_DOMAINS = {
    "nytimes.com",
    "newyorker.com",
    "washingtonpost.com",
    "ft.com",
    "wsj.com",
    "forbes.com",
    "economist.com",
    "bloomberg.com",
    "theatlantic.com",
    "wired.com",
    "theinformation.com",
    "barrons.com",
    "telegraph.co.uk",
    "thetimes.co.uk",
    "foreignpolicy.com",
    "hbr.org",
    "scientificamerican.com",
    "newscientist.com",
    "businessinsider.com",
    "visualcapitalist.com",
    "seekingalpha.com",
    "movieinsider.com",
    "techcrunch.com",
    "venturebeat.com",
    "beehiiv.com",
    "substack.com",
    "read.first1000.co",
}


def main():
    matches = list(BASE.rglob("*.md"))
    touched = 0

    for path in matches:
        if not should_process(path):
            continue

        original = path.read_text(encoding="utf-8")
        if not original.startswith("---"):
            continue

        parts = original.split("---", 2)
        if len(parts) < 3:
            continue

        frontmatter_yaml = parts[1]
        body = parts[2].lstrip("\n")

        try:
            data = yaml.safe_load(frontmatter_yaml) or {}
        except yaml.YAMLError:
            continue

        url = data.get("url", "")
        content_text = strip_html(body)
        word_count = count_words(content_text)

        clip_kind = detect_clip_kind(data, url, word_count)
        tags = build_tags(data, clip_kind)
        needs_reclip = should_flag_reclip(data, word_count, content_text)

        updated = False
        if data.get("clip_kind") != clip_kind:
            data["clip_kind"] = clip_kind
            updated = True

        if sorted(tags) != sorted(data.get("tags", [])):
            data["tags"] = tags
            updated = True

        if needs_reclip and not data.get("needs_reclip"):
            data["needs_reclip"] = True
            updated = True

        if updated:
            touched += 1
            new_frontmatter = yaml.safe_dump(
                data, sort_keys=False, allow_unicode=True
            ).strip()
            rebuilt = f"---\n{new_frontmatter}\n---\n\n{body}"
            path.write_text(rebuilt, encoding="utf-8")

    print(f"Processed {len(matches)} files, updated {touched} files.")


def should_process(path: Path) -> bool:
    if "Knowledge/Clippings" not in str(path):
        return False
    parent = path.parent
    if not parent.name or not re.match(r"\d{4}-\d{2}-\d{2}", parent.name):
        return False
    try:
        folder_date = datetime.strptime(parent.name, "%Y-%m-%d")
    except ValueError:
        return False
    return folder_date >= SINCE


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def count_words(text: str) -> int:
    if not text:
        return 0
    return len(re.findall(r"\w+", text))


def detect_clip_kind(data: dict, url: str, word_count: int) -> str:
    clip_type = data.get("type", "").lower()
    source = (data.get("source") or "").lower()
    if clip_type == "tweet" or source in {"twitter", "x"}:
        return "tweet"
    if data.get("selectionOnly"):
        return "selection"
    if data.get("imageOnly"):
        return "image"
    if url and is_youtube_url(url):
        return "video"
    if url and is_github_url(url):
        return "repo"
    if url and is_news_domain(url):
        return "news"
    if url and is_homepage_url(url) and word_count < 60:
        return "bookmark"
    return "article"


def build_tags(data: dict, clip_kind: str) -> list[str]:
    tags = set(data.get("tags", []))
    if clip_kind == "bookmark":
        tags.add("clipping/bookmark")
    else:
        tags.add("clipping/web")

    if clip_kind == "news":
        tags.add("clipping/news")
    if clip_kind == "repo":
        tags.add("clipping/github")
    if clip_kind == "video":
        tags.add("clipping/youtube")
    if clip_kind in {"tweet", "selection", "image"}:
        tags.add("clipping/twitter" if clip_kind == "tweet" else f"clipping/{clip_kind}")

    if clip_kind != "bookmark":
        tags.add("to-process")

    return sorted(tags)


def should_flag_reclip(data: dict, word_count: int, content: str) -> bool:
    title = (data.get("title") or "").lower()
    if "untitled" in title:
        return True
    if word_count < 25 and len(content) < 240:
        return True
    return False


def is_youtube_url(url: str) -> bool:
    return bool(re.search(r"(youtube\.com|youtu\.be)", url))


def is_github_url(url: str) -> bool:
    return "github.com" in url


def is_news_domain(url: str) -> bool:
    domain = simplify_domain(url)
    return domain in NEWS_DOMAINS


def is_homepage_url(url: str) -> bool:
    if not url:
        return False
    try:
        parsed = Path(url)
    except Exception:
        pass
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        path = parsed.path or "/"
        normalized = path.replace("//", "/") or "/"
        return normalized in {"/", "/home", "/index.html", "/index.htm"}
    except Exception:
        return False


def simplify_domain(url: str) -> str:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        return hostname.lstrip("www.")
    except Exception:
        return ""


if __name__ == "__main__":
    main()
