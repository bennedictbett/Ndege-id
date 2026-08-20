"""
Fetches a representative image + attribution for each bird species (and hotspot)
from Wikipedia / Wikimedia Commons, using their free public API (no key required).

Usage:
    python scripts/fetch_images.py birds       # reads data/birds.csv, writes data/birds_with_images.csv
    python scripts/fetch_images.py hotspots    # writes data/hotspots_with_images.csv

Resumable: if the output CSV already exists and a row already has an image_url,
that row is skipped on the next run. Safe to re-run after a rate limit or
network error without losing progress or re-hitting the API for rows already done.

Handles Wikipedia's 429 (Too Many Requests) with retry + backoff automatically.
"""

import sys
import csv
import os
import time
import requests
from requests.adapters import HTTPAdapter, Retry

HEADERS = {
    "User-Agent": "SautiYaNdegeApp/1.0 (bird ID app; contact: github.com/bennedictbett/Ndege-id)"
}

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
retries = Retry(
    total=6,
    backoff_factor=2,          # 2s, 4s, 8s, 16s, 32s, 64s
    status_forcelist=[429, 500, 502, 503, 504],
    respect_retry_after_header=True,
    allowed_methods=["GET"],
)
SESSION.mount("https://", HTTPAdapter(max_retries=retries))

REQUEST_DELAY = 1.5  # seconds between requests, in addition to retry backoff


def get_page_thumbnail(title, thumb_size=800):
    params = {
        "action": "query",
        "titles": title,
        "prop": "pageimages",
        "piprop": "thumbnail|name",
        "pithumbsize": thumb_size,
        "format": "json",
        "redirects": 1,
    }
    r = SESSION.get(WIKI_API, params=params, timeout=20)
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    for page in pages.values():
        thumb = page.get("thumbnail", {}).get("source")
        filename = page.get("pageimage")
        if thumb and filename:
            return thumb, f"File:{filename}"
    return None, None


def get_attribution(file_title):
    params = {
        "action": "query",
        "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "extmetadata",
        "format": "json",
    }
    r = SESSION.get(COMMONS_API, params=params, timeout=20)
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo")
        if not info:
            continue
        meta = info[0].get("extmetadata", {})
        artist = meta.get("Artist", {}).get("value", "Unknown")
        license_name = meta.get("LicenseShortName", {}).get("value", "Unknown license")
        import re
        artist = re.sub("<[^<]+?>", "", artist)
        return artist.strip(), license_name.strip()
    return "Unknown", "Unknown license"


def fetch_for_name(search_title):
    thumb, file_title = get_page_thumbnail(search_title)
    if not thumb:
        return None
    time.sleep(REQUEST_DELAY)
    artist, license_name = get_attribution(file_title)
    return {
        "image_url": thumb,
        "artist": artist,
        "license": license_name,
        "source": f"https://en.wikipedia.org/wiki/{search_title.replace(' ', '_')}",
    }


def load_existing(path, key_field):
    """Load a previous partial run's output, keyed by name, so we can resume."""
    existing = {}
    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing[row[key_field]] = row
    return existing


def process_birds():
    with open("data/birds.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    out_path = "data/birds_with_images.csv"
    existing = load_existing(out_path, "common_name")

    credits_path = "CREDITS_generated.md"
    credits_lines = []
    if os.path.exists(credits_path):
        with open(credits_path, encoding="utf-8") as f:
            credits_lines = f.read().splitlines()
    if not credits_lines:
        credits_lines = ["## Bird photos (auto-fetched from Wikimedia Commons)\n"]

    for row in rows:
        name = row["common_name"]
        prev = existing.get(name)
        if prev and prev.get("image_url"):
            row["image_url"] = prev["image_url"]
            print(f"Skipping (already done): {name}")
            continue

        print(f"Fetching: {name} ...")
        try:
            result = fetch_for_name(name)
        except requests.exceptions.RequestException as e:
            print(f"  FAILED after retries: {e}")
            print("  Leaving blank for this run -- rerun the script later to retry just this one.")
            result = None

        if result:
            row["image_url"] = result["image_url"]
            credits_lines.append(
                f"- **{name}** — Photographer: {result['artist']} — "
                f"License: {result['license']} — Source: {result['source']}"
            )
            print(f"  found ({result['license']})")
        else:
            print("  no image found, leaving blank")

        # Write progress after EVERY row, so a crash never loses work
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        with open(credits_path, "w", encoding="utf-8") as f:
            f.write("\n".join(credits_lines))

        time.sleep(REQUEST_DELAY)

    print(f"\nDone. See {out_path} and {credits_path}")
    print("Review CREDITS_generated.md and merge into CREDITS.md before shipping.")
    print("If any species show blank image_url, just rerun this script -- it will only retry those.")


HOTSPOT_NAMES = [
    "Lake Naivasha", "Kakamega Forest", "Lake Nakuru National Park",
    "Kinangop Plateau", "Kerio Valley", "Arabuko-Sokoke Forest",
    "Mount Kenya Forest", "Maasai Mara National Reserve",
]

# Some hotspot names don't exactly match a Wikipedia article title.
# Map the display name to a better search title here; the script still
# stores results under the original display name.
HOTSPOT_SEARCH_ALIASES = {
    "Kinangop Plateau": "Kinangop",
    "Mount Kenya Forest": "Mount Kenya National Park",
}


def process_hotspots():
    out_path = "data/hotspots_with_images.csv"
    existing = load_existing(out_path, "name")

    credits_path = "CREDITS_generated_hotspots.md"
    credits_lines = []
    if os.path.exists(credits_path):
        with open(credits_path, encoding="utf-8") as f:
            credits_lines = f.read().splitlines()
    if not credits_lines:
        credits_lines = ["## Hotspot photos (auto-fetched from Wikimedia Commons)\n"]

    results = []
    for name in HOTSPOT_NAMES:
        prev = existing.get(name)
        if prev and prev.get("image_url"):
            print(f"Skipping (already done): {name}")
            results.append((name, prev["image_url"]))
            continue

        search_name = HOTSPOT_SEARCH_ALIASES.get(name, name)
        print(f"Fetching: {name} ...")
        try:
            result = fetch_for_name(search_name)
        except requests.exceptions.RequestException as e:
            print(f"  FAILED after retries: {e}")
            result = None

        if result:
            results.append((name, result["image_url"]))
            credits_lines.append(
                f"- **{name}** — Photographer: {result['artist']} — "
                f"License: {result['license']} — Source: {result['source']}"
            )
            print(f"  found ({result['license']})")
        else:
            results.append((name, ""))
            print("  no image found, leaving blank")

        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["name", "image_url"])
            writer.writerows(results)
        with open(credits_path, "w", encoding="utf-8") as f:
            f.write("\n".join(credits_lines))

        time.sleep(REQUEST_DELAY)

    print(f"\nDone. See {out_path} and {credits_path}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "birds"
    if target == "birds":
        process_birds()
    elif target == "hotspots":
        process_hotspots()
    else:
        print("Usage: python scripts/fetch_images.py [birds|hotspots]")