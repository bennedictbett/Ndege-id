"""
scripts/backfill_metadata.py: add Xeno-canto metadata (recordist, location, licence...)
for recordings already in data/raw that are missing from data/recordings_metadata.csv.

Run from the repo root:
  python scripts/backfill_metadata.py --limit 5     # try 5 first and check the CSV
  python scripts/backfill_metadata.py               # all missing ones
Safe to stop and re-run: it only fetches IDs that are not in the CSV yet.
Needs XC_API_KEY in .env, same as download_xeno_canto.py.
"""
import argparse
import csv
import os
import time
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
except ImportError:                       # dotenv is optional if the key is already set
    load_dotenv = None

ROOT = Path(__file__).resolve().parents[1]
if load_dotenv:
    load_dotenv(ROOT / ".env")
KEY = os.getenv("XC_API_KEY")
if not KEY:
    raise ValueError("XC_API_KEY not found in environment variables")

RAW = ROOT / "data" / "raw"
CSV_PATH = ROOT / "data" / "recordings_metadata.csv"
API_URL = "https://xeno-canto.org/api/3/recordings"
FIELDS = ["id", "species", "en", "rec", "cnt", "loc", "lat", "lon",
          "type", "q", "length", "lic", "url"]


def logged_ids():
    if not CSV_PATH.exists():
        return set()
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        return {row["id"] for row in csv.DictReader(f)}


def fetch(xc_id):
    """Return the Xeno-canto record with this catalogue number, or None."""
    for attempt in range(4):
        try:
            r = requests.get(API_URL, params={"query": f"nr:{xc_id}", "key": KEY}, timeout=60)
            r.raise_for_status()
            for rec in r.json().get("recordings", []):
                if str(rec.get("id")) == str(xc_id):
                    return rec
            return None
        except requests.RequestException:
            time.sleep(2 * 2 ** attempt)   # error text omitted: it contains the API key
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="only fetch this many")
    args = ap.parse_args()

    have = logged_ids()
    todo = [(p.parent.name, p.stem) for p in sorted(RAW.glob("*/*.mp3"))
            if p.stem not in have]
    if args.limit:
        todo = todo[:args.limit]
    print(f"{len(have)} already logged; fetching {len(todo)} missing")

    new_file = not CSV_PATH.exists()
    missed = 0
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new_file:
            w.writeheader()
        for i, (species, xc_id) in enumerate(todo, 1):
            rec = fetch(xc_id)
            if rec is None:
                missed += 1
                print(f"  no record found for {species}/{xc_id}")
            else:
                row = {k: rec.get(k, "") for k in FIELDS}
                row["id"], row["species"] = xc_id, species
                w.writerow(row)
                f.flush()
            if i % 50 == 0:
                print(f"  {i}/{len(todo)}")
            time.sleep(0.5)
    print(f"Done. {len(todo) - missed} added, {missed} not found.")


if __name__ == "__main__":
    main()