"""
Builds the reference embedding table used for Photo Identification.

This is NOT run at request time — run it manually, once, and again
whenever bird_images changes (new species added, photos swapped):

    cd backend
    python ../ml/build_photo_embeddings.py

Requires the same SUPABASE_URL / SUPABASE_KEY env vars main.py uses
(loaded from backend/.env via python-dotenv).

What it does: downloads every reference photo in bird_images, runs each
through a pretrained (ImageNet) ResNet18 with its final classification
layer removed, and saves the resulting 512-dim embeddings to
ml/models/photo_embeddings.json. No training, no API key — the
pretrained weights ship with torchvision and download once on first run.
"""

import os
import sys
import json
import tempfile

import requests
import torch
import torch.nn as nn
from torchvision import transforms, models
from torchvision.models import ResNet18_Weights
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "ml", "models", "photo_embeddings.json")
IMG_SIZE = 224

load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


def load_feature_extractor():
    """Pretrained ResNet18, final fc layer swapped for identity —
    output is the 512-dim pooled feature vector instead of class logits."""
    model = models.resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
    model.fc = nn.Identity()
    model.eval()
    return model


def embed_image_url(model, url):
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name
    try:
        img = Image.open(tmp_path).convert("RGB")
        tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            embedding = model(tensor)[0]
        return embedding.tolist()
    finally:
        os.unlink(tmp_path)


def main():
    print("Loading pretrained ResNet18 feature extractor...")
    model = load_feature_extractor()

    print("Fetching birds and bird_images from Supabase...")
    birds = {b["id"]: b for b in supabase.table("birds").select("*").execute().data}
    images = supabase.table("bird_images").select("*").execute().data

    if not images:
        print("No rows in bird_images — nothing to embed.")
        sys.exit(1)

    entries = []
    for i, img in enumerate(images):
        bird = birds.get(img["bird_id"])
        if not bird:
            print(f"  [{i+1}/{len(images)}] skipping — bird_id {img['bird_id']} not found")
            continue
        print(f"  [{i+1}/{len(images)}] embedding {bird['common_name']} ({img['image_url']})")
        try:
            embedding = embed_image_url(model, img["image_url"])
        except Exception as e:
            print(f"    failed: {e}")
            continue
        entries.append({
            "bird_id": bird["id"],
            "common_name": bird["common_name"],
            "scientific_name": bird["scientific_name"],
            "image_id": img["id"],
            "embedding": embedding,
        })

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(entries, f)

    print(f"\nSaved {len(entries)} embeddings to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()