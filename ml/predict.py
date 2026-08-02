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