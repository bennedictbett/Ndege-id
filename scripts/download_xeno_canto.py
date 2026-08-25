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
    # Original 10
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

    # Starlings
    "Lamprotornis hildebrandti",
    "Cinnyricinclus leucogaster",
    "Lamprotornis chalybaeus",
    "Onychognathus morio",
    "Creatophora cinerea",
    "Lamprotornis purpuroptera",
    "Lamprotornis unicolor",
    "Onychognathus tenuirostris",

    # Doves
    "Streptopelia capicola",
    "Streptopelia senegalensis",
    "Columba guinea",
    "Turtur chalcospilos",

    # Weavers
    "Ploceus cucullatus",
    "Ploceus intermedius",
    "Ploceus baglafecht",
    "Ploceus spekei",
    "Ploceus jacksoni",
    "Ploceus xanthops",
    "Ploceus ocularis",
    "Ploceus melanocephalus",

    # Sunbirds
    "Cinnyris venustus",
    "Chalcomitra senegalensis",
    "Nectarinia kilimensis",
    "Cinnyris mediocris",
    "Cinnyris erythrocercus",
    "Cinnyris mariquensis",
    "Hedydipna collaris",
    "Anthreptes orientalis",

    # Kingfishers
    "Alcedo cristata",
    "Megaceryle maxima",
    "Halcyon senegalensis",
    "Halcyon chelicuti",
    "Halcyon albiventris",
    "Halcyon leucocephala",
    "Corythornis cyanostigma",

    # Eagles
    "Stephanoaetus coronatus",
    "Aquila verreauxii",
    "Lophaetus occipitalis",
    "Circaetus pectoralis",
    "Polemaetus bellicosus",

    # Buzzards
    "Buteo augur",
    "Buteo buteo",

    # Kites
    "Elanus caeruleus",

    # Falcons
    "Falco tinnunculus",
    "Falco biarmicus",
    "Falco peregrinus",

    # Hawks
    "Polyboroides typus",

    # Vultures
    "Gyps africanus",
    "Gyps rueppelli",
    "Necrosyrtes monachus",

    # Secretarybird
    "Sagittarius serpentarius",

]

def get_recordings(scientific_name, max_recordings=20):
    parts = scientific_name.split(" ")
    genus = parts[0]
    species = parts[1]
    
    queries = [
        f"gen:{genus} sp:{species} cnt:Kenya q:A",
        f"gen:{genus} sp:{species} cnt:Kenya q:B",
        f"gen:{genus} sp:{species} cnt:Tanzania q:A",
        f"gen:{genus} sp:{species} cnt:Tanzania q:B",
        f"gen:{genus} sp:{species} cnt:Uganda q:A",
        f"gen:{genus} sp:{species} cnt:Uganda q:B",
        f"gen:{genus} sp:{species} area:africa q:A",
        f"gen:{genus} sp:{species} area:africa q:B",
        f"gen:{genus} sp:{species} q:A",
        f"gen:{genus} sp:{species} q:B",
    ]
    
    all_recordings = []
    seen_ids = set()
    
    for query in queries:
        if len(all_recordings) >= max_recordings:
            break
        url = "https://xeno-canto.org/api/3/recordings"
        params = {"query": query, "key": XC_API_KEY}
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            recordings = response.json().get("recordings", [])
            for rec in recordings:
                if rec["id"] not in seen_ids:
                    seen_ids.add(rec["id"])
                    all_recordings.append(rec)
            if recordings:
                print(f"  Found {len(all_recordings)} so far with: {query}")
        except Exception as e:
            print(f"  API error: {str(e).replace(XC_API_KEY, '***')}")
        time.sleep(0.5)
    
    return all_recordings[:max_recordings]


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