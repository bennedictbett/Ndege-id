import os
import json

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms, models
from torchvision.models import ResNet18_Weights
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMBEDDINGS_PATH = os.path.join(BASE_DIR, "ml", "models", "photo_embeddings.json")
IMG_SIZE = 224

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

_model = None
_reference_embeddings = None  # tensor, shape (N, 512)
_reference_meta = None        # list of {bird_id, common_name, scientific_name, image_id}


def _load_model():
    global _model
    if _model is None:
        model = models.resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
        model.fc = nn.Identity()
        model.eval()
        _model = model
    return _model


def _load_reference_embeddings():
    global _reference_embeddings, _reference_meta
    if _reference_embeddings is None:
        if not os.path.exists(EMBEDDINGS_PATH):
            raise FileNotFoundError(
                f"{EMBEDDINGS_PATH} not found — run "
                "`python ml/build_photo_embeddings.py` first to build it."
            )
        with open(EMBEDDINGS_PATH) as f:
            entries = json.load(f)
        _reference_embeddings = torch.tensor([e["embedding"] for e in entries])
        _reference_meta = [
            {k: e[k] for k in ("bird_id", "common_name", "scientific_name")}
            for e in entries
        ]
    return _reference_embeddings, _reference_meta


def predict_photo(image_path):
    """
    Returns the same overall shape as ml.predict.predict(), so ResultScreen
    can render either without a special case — but the numbers here are
    cosine-similarity scores against reference photos, not a calibrated
    classifier's probabilities. Field is still called "confidence" for
    structural compatibility; the app labels it "Visual Similarity" in
    the UI so it isn't mistaken for the sound model's real confidence.
    """
    model = _load_model()
    reference_embeddings, reference_meta = _load_reference_embeddings()

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        query_embedding = model(tensor)[0]

    similarities = F.cosine_similarity(
        query_embedding.unsqueeze(0), reference_embeddings
    )

    # Multiple reference photos can belong to the same species — keep
    # only the best-matching photo per species before ranking.
    best_per_bird = {}
    for meta, sim in zip(reference_meta, similarities.tolist()):
        bird_id = meta["bird_id"]
        if bird_id not in best_per_bird or sim > best_per_bird[bird_id]["similarity"]:
            best_per_bird[bird_id] = {**meta, "similarity": sim}

    ranked = sorted(best_per_bird.values(), key=lambda e: e["similarity"], reverse=True)
    if not ranked:
        raise ValueError("No reference embeddings available to compare against.")

    top = ranked[0]
    top3 = [
        {
            "scientific_name": r["scientific_name"],
            "common_name": r["common_name"],
            "confidence": round(max(r["similarity"], 0) * 100, 2),
        }
        for r in ranked[:3]
    ]

    return {
        "predicted_species": top["common_name"],
        "scientific_name": top["scientific_name"],
        "bird_id": top["bird_id"],
        "confidence": round(max(top["similarity"], 0) * 100, 2),
        "top3": top3,
    }