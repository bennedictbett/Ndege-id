import os
import torch
import librosa
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from torchvision import transforms, models
from PIL import Image
import torch.nn as nn
import tempfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "models", "best_model.pth")

SAMPLE_RATE = 22050
DURATION = 5
N_MELS = 128
HOP_LENGTH = 512
IMG_SIZE = 224

LABEL_TO_SPECIES = {
    0: "Haliaeetus_vocifer",
    1: "Bostrychia_hagedash",
    2: "Cuculus_solitarius",
    3: "Ceryle_rudis",
    4: "Milvus_migrans",
    5: "Lophoceros_nasutus",
    6: "Laniarius_aethiopicus",
    7: "Pycnonotus_barbatus",
    8: "Lamprotornis_superbus",
    9: "Cossypha_heuglini",
    10: "Lamprotornis_hildebrandti",
    11: "Cinnyricinclus_leucogaster",
    12: "Lamprotornis_chalybaeus",
    13: "Onychognathus_morio",
    14: "Creatophora_cinerea",
    15: "Lamprotornis_purpuroptera",
    16: "Lamprotornis_unicolor",
    17: "Onychognathus_tenuirostris",
    18: "Streptopelia_capicola",
    19: "Columba_guinea",
    20: "Turtur_chalcospilos",
    21: "Ploceus_cucullatus",
    22: "Ploceus_intermedius",
    23: "Ploceus_baglafecht",
    24: "Ploceus_spekei",
    25: "Ploceus_jacksoni",
    26: "Ploceus_xanthops",
    27: "Ploceus_ocularis",
    28: "Ploceus_melanocephalus",
    29: "Cinnyris_venustus",
    30: "Chalcomitra_senegalensis",
    31: "Nectarinia_kilimensis",
    32: "Cinnyris_mediocris",
    33: "Cinnyris_erythrocercus",
    34: "Cinnyris_mariquensis",
    35: "Hedydipna_collaris",
    36: "Anthreptes_orientalis",
    37: "Megaceryle_maxima",
    38: "Halcyon_senegalensis",
    39: "Halcyon_chelicuti",
    40: "Halcyon_albiventris",
    41: "Halcyon_leucocephala",
    42: "Stephanoaetus_coronatus",
    43: "Lophaetus_occipitalis",
    44: "Buteo_buteo",
    45: "Elanus_caeruleus",
    46: "Falco_tinnunculus",
    47: "Falco_peregrinus",
    48: "Polyboroides_typus",
}

SPECIES_TO_COMMON = {
    "Haliaeetus_vocifer": "African Fish Eagle",
    "Bostrychia_hagedash": "Hadada Ibis",
    "Cuculus_solitarius": "Red-chested Cuckoo",
    "Ceryle_rudis": "Pied Kingfisher",
    "Milvus_migrans": "Black Kite",
    "Lophoceros_nasutus": "African Grey Hornbill",
    "Laniarius_aethiopicus": "Tropical Boubou",
    "Pycnonotus_barbatus": "Common Bulbul",
    "Lamprotornis_superbus": "Superb Starling",
    "Cossypha_heuglini": "White-browed Robin-Chat",
    "Lamprotornis_hildebrandti": "Hildebrandt's Starling",
    "Cinnyricinclus_leucogaster": "Violet-backed Starling",
    "Lamprotornis_chalybaeus": "Greater Blue-eared Starling",
    "Onychognathus_morio": "Red-winged Starling",
    "Creatophora_cinerea": "Wattled Starling",
    "Lamprotornis_purpuroptera": "Rüppell's Starling",
    "Lamprotornis_unicolor": "Ashy Starling",
    "Onychognathus_tenuirostris": "Slender-billed Starling",
    "Streptopelia_capicola": "Ring-necked Dove",
    "Columba_guinea": "Speckled Pigeon",
    "Turtur_chalcospilos": "Emerald-spotted Wood-Dove",
    "Ploceus_cucullatus": "Village Weaver",
    "Ploceus_intermedius": "Lesser Masked Weaver",
    "Ploceus_baglafecht": "Baglafecht Weaver",
    "Ploceus_spekei": "Speke's Weaver",
    "Ploceus_jacksoni": "Golden-backed Weaver",
    "Ploceus_xanthops": "Holub's Golden Weaver",
    "Ploceus_ocularis": "Spectacled Weaver",
    "Ploceus_melanocephalus": "Black-headed Weaver",
    "Cinnyris_venustus": "Variable Sunbird",
    "Chalcomitra_senegalensis": "Scarlet-chested Sunbird",
    "Nectarinia_kilimensis": "Bronzy Sunbird",
    "Cinnyris_mediocris": "Eastern Double-collared Sunbird",
    "Cinnyris_erythrocercus": "Red-chested Sunbird",
    "Cinnyris_mariquensis": "Marico Sunbird",
    "Hedydipna_collaris": "Collared Sunbird",
    "Anthreptes_orientalis": "Eastern Violet-backed Sunbird",
    "Megaceryle_maxima": "Giant Kingfisher",
    "Halcyon_senegalensis": "Woodland Kingfisher",
    "Halcyon_chelicuti": "Striped Kingfisher",
    "Halcyon_albiventris": "Brown-hooded Kingfisher",
    "Halcyon_leucocephala": "Grey-headed Kingfisher",
    "Stephanoaetus_coronatus": "Crowned Eagle",
    "Lophaetus_occipitalis": "Long-crested Eagle",
    "Buteo_buteo": "Common Buzzard",
    "Elanus_caeruleus": "Black-winged Kite",
    "Falco_tinnunculus": "Common Kestrel",
    "Falco_peregrinus": "Peregrine Falcon",
    "Polyboroides_typus": "African Harrier-Hawk",
}

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def load_model():
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(LABEL_TO_SPECIES))
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()
    return model

def audio_to_spectrogram_tensor(audio_path):
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, duration=DURATION)

    target_length = SAMPLE_RATE * DURATION
    if len(y) < target_length:
        y = np.pad(y, (0, target_length - len(y)))

    mel_spec = librosa.feature.melspectrogram(
        y=y, sr=sr, n_mels=N_MELS, hop_length=HOP_LENGTH
    )
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    # Save to temp file then load as image
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name

    plt.figure(figsize=(2.24, 2.24), dpi=100)
    plt.axis("off")
    librosa.display.specshow(mel_spec_db, sr=sr, hop_length=HOP_LENGTH)
    plt.tight_layout(pad=0)
    plt.savefig(tmp_path, bbox_inches="tight", pad_inches=0)
    plt.close()

    img = Image.open(tmp_path).convert("RGB")
    os.unlink(tmp_path)
    return transform(img).unsqueeze(0)

def predict(audio_path):
    model = load_model()

    tensor = audio_to_spectrogram_tensor(audio_path)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        predicted_label = probabilities.argmax().item()
        confidence = probabilities[predicted_label].item()

    scientific_name = LABEL_TO_SPECIES[predicted_label]
    common_name = SPECIES_TO_COMMON[scientific_name]

    # Top 3 predictions
    top3 = torch.topk(probabilities, 3)
    top3_results = []
    for i in range(3):
        label = top3.indices[i].item()
        prob = top3.values[i].item()
        sci = LABEL_TO_SPECIES[label]
        top3_results.append({
            "scientific_name": sci,
            "common_name": SPECIES_TO_COMMON[sci],
            "confidence": round(prob * 100, 2)
        })

    return {
        "predicted_species": common_name,
        "scientific_name": scientific_name,
        "confidence": round(confidence * 100, 2),
        "top3": top3_results
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ml/predict.py <audio_file.mp3>")
    else:
        audio_path = sys.argv[1]
        result = predict(audio_path)
        print(f"\nPredicted: {result['predicted_species']}")
        print(f"Scientific: {result['scientific_name']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"\nTop 3:")
        for r in result['top3']:
            print(f"  {r['common_name']}: {r['confidence']}%")