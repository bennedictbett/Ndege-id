"""
scripts/download_xeno_canto.py: resumable Xeno-canto downloader.

Run from the repo root:  python scripts/download_xeno_canto.py

- Species come from ml/labels.py (no more drift between scripts).
- Resumable: species that already have TARGET_PER_SPECIES files are skipped,
  and files are only renamed into place once fully downloaded.
- Writes data/recordings_metadata.csv (recordist, license, location, quality)
  so you can build CREDITS.md and check licenses before shipping.
- Skips very short and very long recordings (saves bandwidth and disk).
Expect a few hours for ~73 species x 100 recordings. Safe to stop and re-run.
"""
import csv
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ml.labels import SPECIES_LABELS, scientific_name  # noqa: E402

load_dotenv(ROOT / ".env")
XC_API_KEY = os.getenv("XC_API_KEY")
if not XC_API_KEY:
    raise ValueError("XC_API_KEY not found in environment variables")

DOWNLOAD_DIR = ROOT / "data" / "raw"
METADATA_CSV = ROOT / "data" / "recordings_metadata.csv"
API_URL = "https://xeno-canto.org/api/3/recordings"

TARGET_PER_SPECIES = 100
MIN_LENGTH_SEC = 5
MAX_LENGTH_SEC = 180          # skip huge files; 3 minutes is plenty per recording
MAX_PAGES_PER_QUERY = 3
FIELDS = ["id", "species", "en", "rec", "cnt", "loc", "lat", "lon",
          "type", "q", "length", "lic", "url"]


def request_with_retry(url, params=None, stream=False, tries=4):
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, stream=stream, timeout=60)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            wait = 2 * 2 ** attempt
            msg = str(e).replace(XC_API_KEY, "***")
            print(f"    retry {attempt + 1}/{tries} in {wait}s: {msg}")
            time.sleep(wait)
    return None


def length_seconds(text):
    """'0:45' or '1:02:10' -> seconds; None if unparseable."""
    try:
        seconds = 0
        for part in str(text).split(":"):
            seconds = seconds * 60 + int(float(part))
        return seconds
    except ValueError:
        return None


def usable(rec):
    if not rec.get("file"):
        return False
    secs = length_seconds(rec.get("length", ""))
    return secs is None or MIN_LENGTH_SEC <= secs <= MAX_LENGTH_SEC


def queries(genus, sp):
    base = f"gen:{genus} sp:{sp}"
    order = [
        "cnt:Kenya q:A", "cnt:Kenya q:B",
        "cnt:Tanzania q:A", "cnt:Tanzania q:B",
        "cnt:Uganda q:A", "cnt:Uganda q:B",
        "area:africa q:A", "area:africa q:B",
        "q:A", "q:B",
        "area:africa q:C",          # last resort for rare species
    ]
    return [f"{base} {o}" for o in order]


def iter_query(query):
    """Yield recordings for a query, following pagination (bounded)."""
    for page in range(1, MAX_PAGES_PER_QUERY + 1):
        r = request_with_retry(API_URL, {"query": query, "key": XC_API_KEY, "page": page})
        if r is None:
            return
        data = r.json()
        yield from data.get("recordings", [])
        if page >= int(data.get("numPages", 1) or 1):
            return
        time.sleep(0.5)


def gather(name, need, have_ids):
    genus, sp = name.split(" ")[:2]
    found, seen = [], set(have_ids)
    for query in queries(genus, sp):
        for rec in iter_query(query):
            if rec["id"] in seen or not usable(rec):
                continue
            seen.add(rec["id"])
            found.append(rec)
            if len(found) >= need:
                return found
        time.sleep(0.5)
    return found


def download(rec, folder: Path):
    final = folder / f"{rec['id']}.mp3"
    if final.exists():
        return True
    tmp = final.with_suffix(".part")
    r = request_with_retry(rec["file"], stream=True)
    if r is None:
        return False
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    tmp.rename(final)
    return True


def load_logged_ids():
    if not METADATA_CSV.exists():
        return set()
    with open(METADATA_CSV, newline="", encoding="utf-8") as f:
        return {row["id"] for row in csv.DictReader(f)}


def log_metadata(rec, folder_name, logged):
    if rec["id"] in logged:
        return
    new_file = not METADATA_CSV.exists()
    with open(METADATA_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new_file:
            w.writeheader()
        row = {k: rec.get(k, "") for k in FIELDS}
        row["species"] = folder_name
        w.writerow(row)
    logged.add(rec["id"])


def main():
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    logged = load_logged_ids()
    thin = []

    for folder_name in SPECIES_LABELS:
        folder = DOWNLOAD_DIR / folder_name
        folder.mkdir(exist_ok=True)
        have = {p.stem for p in folder.glob("*.mp3")}
        print(f"\n{folder_name}: {len(have)}/{TARGET_PER_SPECIES} already downloaded")

        if len(have) < TARGET_PER_SPECIES:
            recs = gather(scientific_name(folder_name), TARGET_PER_SPECIES - len(have), have)
            print(f"  {len(recs)} new recordings to fetch")
            for i, rec in enumerate(recs, 1):
                if download(rec, folder):
                    log_metadata(rec, folder_name, logged)
                    have.add(rec["id"])
                    if i % 10 == 0:
                        print(f"  {i}/{len(recs)} downloaded")
                time.sleep(0.5)

        if len(have) < 30:
            thin.append((folder_name, len(have)))

    print("\nDone.")
    if thin:
        print("Species with fewer than 30 recordings (expect weak accuracy):")
        for name, n in thin:
            print(f"  {name}: {n}")


if __name__ == "__main__":
    main()