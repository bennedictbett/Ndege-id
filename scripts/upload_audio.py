"""
Picks one downloaded recording per species from data/raw/<Species_Name>/,
uploads it to the "bird-audio" Supabase storage bucket, looks up real
attribution (recordist + license) from Xeno-canto using the recording ID
already embedded in the filename (scripts/download_xeno_canto.py saves
files as <id>.mp3), and sets birds.audio_url.

Requires the same env vars as your other scripts:
    SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, XENOCANTO_API_KEY

Usage:
    python scripts/upload_audio.py

Resumable: skips a species if it already has audio_url set in the birds
table, so it's safe to re-run after a partial failure.
"""

import os
import re
import time
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
XC_API_KEY = os.getenv("XENOCANTO_API_KEY") or os.getenv("XC_API_KEY")

if not SUPABASE_SERVICE_KEY:
    raise SystemExit("SUPABASE_SERVICE_KEY is not set -- required for storage upload and birds.audio_url writes.")
if not XC_API_KEY:
    raise SystemExit("XENOCANTO_API_KEY (or XC_API_KEY) is not set -- required to fetch attribution.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

RAW_DIR = "data/raw"
BUCKET = "bird-audio"
CREDITS_PATH = "CREDITS_generated_audio.md"


def get_bird(scientific_name):
    resp = supabase.table("birds").select("id, audio_url").eq("scientific_name", scientific_name).execute()
    return resp.data[0] if resp.data else None


def get_bird_with_retry(scientific_name, max_attempts=3):
    """Wraps get_bird with retry+backoff -- Supabase connections can
    occasionally time out (e.g. after a period of inactivity), and one
    such blip shouldn't be allowed to kill the whole run."""
    for attempt in range(1, max_attempts + 1):
        try:
            return get_bird(scientific_name)
        except Exception as e:
            if attempt == max_attempts:
                raise
            wait = 2 ** attempt
            print(f"  ⚠ Supabase connection issue ({e}), retrying in {wait}s...")
            time.sleep(wait)


def get_attribution(recording_id):
    """Look up recordist + license for one specific recording by its XC id."""
    params = {"query": f"nr:{recording_id}", "key": XC_API_KEY}
    r = requests.get("https://xeno-canto.org/api/3/recordings", params=params, timeout=20)
    r.raise_for_status()
    recs = r.json().get("recordings", [])
    if not recs:
        return None
    rec = recs[0]
    return {
        "recordist": rec.get("rec", "Unknown"),
        "license": rec.get("lic", "unknown"),
        "type": rec.get("type", "unknown"),
        "source": f"https://xeno-canto.org/{recording_id}",
    }


def upload_audio(filepath, filename):
    with open(filepath, "rb") as f:
        path = f"birds/{filename}"
        supabase_admin.storage.from_(BUCKET).upload(
            path, f, {"content-type": "audio/mpeg", "upsert": "true"}
        )
    return supabase_admin.storage.from_(BUCKET).get_public_url(path)


def main():
    species_folders = sorted([
        d for d in os.listdir(RAW_DIR)
        if os.path.isdir(os.path.join(RAW_DIR, d))
    ])
    print(f"Found {len(species_folders)} species folders")

    credits_lines = []
    if os.path.exists(CREDITS_PATH):
        with open(CREDITS_PATH, encoding="utf-8") as f:
            credits_lines = f.read().splitlines()
    if not credits_lines:
        credits_lines = ["## Bird call recordings (Xeno-canto, uploaded to Supabase)\n"]

    done, skipped, failed = 0, 0, 0

    for folder in species_folders:
        scientific_name = folder.replace("_", " ")
        folder_path = os.path.join(RAW_DIR, folder)

        try:
            mp3_files = sorted([f for f in os.listdir(folder_path) if f.endswith(".mp3")])
            if not mp3_files:
                print(f"⚠ {scientific_name}: no mp3 files, skipping")
                skipped += 1
                continue

            bird = get_bird_with_retry(scientific_name)
            if not bird:
                print(f"⚠ {scientific_name}: not in birds table (not part of the current 49-species model), skipping")
                skipped += 1
                continue

            if bird.get("audio_url"):
                print(f"✓ {scientific_name}: already has audio_url, skipping")
                skipped += 1
                continue

            # Try files in order until one uploads successfully. Most species
            # succeed on the first (highest-priority) file; this loop only
            # kicks in when that file is rejected for being too large, in
            # which case we fall back to smaller alternatives from the same
            # species instead of giving up entirely.
            audio_url = None
            chosen_file = None
            recording_id = None
            upload_error = None

            for candidate in mp3_files:
                candidate_path = os.path.join(folder_path, candidate)
                print(f"Uploading: {scientific_name} ({candidate}) ...")
                try:
                    audio_url = upload_audio(candidate_path, candidate)
                    chosen_file = candidate
                    recording_id = re.sub(r"\.mp3$", "", candidate)
                    break
                except Exception as e:
                    err_str = str(e)
                    if "EntityTooLarge" in err_str or "exceeded the maximum" in err_str:
                        print(f"  ⚠ {candidate} too large, trying next file...")
                        continue
                    # Non-size errors (auth, network, etc.) aren't fixed by
                    # trying a different file -- stop here and report it.
                    upload_error = e
                    break

            if audio_url is None:
                if upload_error:
                    print(f"  ✗ Upload failed: {upload_error}")
                else:
                    print(f"  ✗ All {len(mp3_files)} files too large, skipping species")
                failed += 1
                continue

            try:
                attribution = get_attribution(recording_id)
            except requests.exceptions.RequestException as e:
                print(f"  ⚠ Attribution lookup failed ({e}), continuing without it")
                attribution = None

            try:
                supabase_admin.table("birds").update({"audio_url": audio_url}).eq("id", bird["id"]).execute()
            except Exception as e:
                print(f"  ✗ Failed to set audio_url in DB: {e}")
                failed += 1
                continue

            if attribution:
                credits_lines.append(
                    f"- **{scientific_name}** ({attribution['type']}) — "
                    f"Recordist: {attribution['recordist']} — License: {attribution['license']} — "
                    f"Source: {attribution['source']}"
                )
            else:
                credits_lines.append(
                    f"- **{scientific_name}** — Source: https://xeno-canto.org/{recording_id} "
                    f"(attribution lookup failed, verify manually)"
                )

            with open(CREDITS_PATH, "w", encoding="utf-8") as f:
                f.write("\n".join(credits_lines))

        except Exception as e:
            # Catches anything unexpected (e.g. a network timeout that
            # slipped past the inner try/excepts) so ONE species failing
            # never takes down the whole run. Rerun the script afterward --
            # already-uploaded species are skipped automatically.
            print(f"  ✗ Unexpected error on {scientific_name}, skipping: {e}")
            failed += 1
            continue

        print(f"  ✓ Done")
        done += 1
        time.sleep(0.5)

    print(f"\n✓ Uploaded: {done}  ⚠ Skipped: {skipped}  ✗ Failed: {failed}")
    print(f"Attribution written to {CREDITS_PATH} -- review and merge into CREDITS.md before shipping.")
    print("Reminder: most Xeno-canto recordings are CC BY-NC-SA -- check licenses before any commercial use.")


if __name__ == "__main__":
    main()