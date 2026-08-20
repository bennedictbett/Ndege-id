import os
import csv
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    raise SystemExit(
        "SUPABASE_SERVICE_KEY is not set. Add it to your local .env "
        "(same key used by populate_birds.py). This bypasses RLS, so keep it local-only."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def populate_hotspots():
    with open("data/hotspots_with_images.csv", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        hotspots = list(reader)

    print(f"Found {len(hotspots)} hotspots in CSV")

    for spot in hotspots:
        image_url = spot.get("image_url") or None
        data = {
            "name": spot["name"],
            "image_url": image_url,
        }
        # Only updates image_url via upsert keyed on name -- assumes `name`
        # has a unique constraint on the hotspots table (it was inserted
        # via the earlier seed SQL, one row per name).
        response = supabase.table("hotspots").upsert(data, on_conflict="name").execute()
        status = "image added" if image_url else "no image, skipped update"
        print(f"  {spot['name']}: {status}")

    print(f"\nDone. Processed {len(hotspots)} hotspots.")


if __name__ == "__main__":
    populate_hotspots()