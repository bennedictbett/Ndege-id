import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

IMAGES_DIR = "data/images/processed"

# Map image filename prefix to bird scientific name
SPECIES_MAP = {
    "african_fish_eagle": "Haliaeetus vocifer",
    "hadada_ibis": "Bostrychia hagedash",
    "red_chested_cuckoo": "Cuculus solitarius",
    "pied_kingfisher": "Ceryle rudis",
    "black_kite": "Milvus migrans",
    "african_grey_hornbill": "Lophoceros nasutus",
    "tropical_boubou": "Laniarius aethiopicus",
    "common_bulbul": "Pycnonotus barbatus",
    "superb_starling": "Lamprotornis superbus",
    "white_browed_robin_chat": "Cossypha heuglini",
}

def get_bird_id(scientific_name):
    response = supabase.table("birds").select("id").eq("scientific_name", scientific_name).execute()
    if response.data:
        return response.data[0]["id"]
    return None

def upload_image(filepath, filename):
    with open(filepath, "rb") as f:
        path = f"birds/{filename}"
        supabase_admin.storage.from_("bird-images").upload(
            path, f, {"content-type": "image/jpeg", "upsert": "true"}
        )
    public_url = supabase_admin.storage.from_("bird-images").get_public_url(f"birds/{filename}")
    return public_url

def main():
    files = sorted([f for f in os.listdir(IMAGES_DIR) if f.endswith(".jpg")])
    print(f"Found {len(files)} images")

    for filename in files:
        # Match filename to species e.g. african_fish_eagle_1.jpg
        prefix = "_".join(filename.replace(".jpg", "").split("_")[:-1])
        scientific_name = SPECIES_MAP.get(prefix)

        if not scientific_name:
            print(f"  ✗ No species match for: {filename}")
            continue

        bird_id = get_bird_id(scientific_name)
        if not bird_id:
            print(f"  ✗ Bird not found in DB: {scientific_name}")
            continue

        filepath = os.path.join(IMAGES_DIR, filename)
        image_url = upload_image(filepath, filename)

        is_primary = filename.endswith("_1.jpg")
        angle = "primary" if is_primary else "secondary"

        supabase.table("bird_images").insert({
            "bird_id": bird_id,
            "image_url": image_url,
            "angle": angle,
            "is_primary": is_primary
        }).execute()

        print(f"  ✓ {filename} → {scientific_name}")

    print("\n✓ Done.")

if __name__ == "__main__":
    main()