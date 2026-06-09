import requests
import os
import time
from dotenv import load_dotenv

load_dotenv()
XC_API_KEY = os.getenv("XC_API_KEY")

if not XC_API_KEY:
    raise ValueError("XC_API_KEY not found in environment variables")

DOWNLOAD_DIR = "data/raw"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

SPECIES = [
    "Haliaeetus vocifer",
    "Bostrychia hagedash",
    "Cuculus solitarius",
    "Ceryle rudis",
    "Milvus migrans",
    "Lophoceros nasutus",
    "Laniarius aethiopicus",
    "Pycnonotus barbatus",
    "Lamprotornis superbus",
    "Cossypha heuglini",
]

def get_recordings(scientific_name, max_recordings=5):
    parts = scientific_name.split(" ")
    genus = parts[0]
    species = parts[1]
    
    # v3 uses gen: and sp: tags separately
    query = f"gen:{genus} sp:{species} cnt:Kenya q:A"
    url = "https://xeno-canto.org/api/3/recordings"
    params = {
        "query": query,
        "key": XC_API_KEY
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json().get("recordings", [])[:max_recordings]
    except Exception as e:
        print(f"  API error for {scientific_name}: {e}")
        return []

def download_recording(recording, species_folder):
    file_url = recording["file"]  # v3 already has full URL, no need to add "https:"
    filename = f"{recording['id']}.mp3"
    filepath = os.path.join(species_folder, filename)
    if os.path.exists(filepath):
        print(f"  Already exists: {filename}")
        return filepath
    r = requests.get(file_url, stream=True)
    with open(filepath, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"  Downloaded: {filename}")
    return filepath

def main():
    total = 0
    for species in SPECIES:
        folder_name = species.replace(" ", "_")
        species_folder = os.path.join(DOWNLOAD_DIR, folder_name)
        os.makedirs(species_folder, exist_ok=True)
        print(f"\nFetching: {species}")
        recordings = get_recordings(species)
        if not recordings:
            print(f"  No recordings found for {species}")
            continue
        for rec in recordings:
            download_recording(rec, species_folder)
            time.sleep(1)
        total += len(recordings)

    print(f"\n✓ Done. Total recordings downloaded: {total}")

if __name__ == "__main__":
    main()