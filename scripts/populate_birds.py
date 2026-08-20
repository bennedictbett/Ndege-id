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
        "(copy it from Supabase dashboard -> Settings -> API -> service_role secret). "
        "This key bypasses RLS, so keep it local-only and never deploy it."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def populate_birds():
    with open("data/birds.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        birds = list(reader)

    print(f"Found {len(birds)} birds in CSV")

    for bird in birds:
        data = {
            "common_name": bird["common_name"],
            "scientific_name": bird["scientific_name"],
            "family": bird["family"],
            "habitat": bird["habitat"],
            "conservation_status": bird["conservation_status"],
            "description": bird["description"],
            "image_url": bird["image_url"] or None,
            "audio_url": bird["audio_url"] or None,
        }
        response = supabase.table("birds").upsert(data, on_conflict="scientific_name").execute()
        print(f"  ✓ Inserted: {bird['common_name']}")

    print(f"\n✓ Done. {len(birds)} birds populated.")

if __name__ == "__main__":
    populate_birds()