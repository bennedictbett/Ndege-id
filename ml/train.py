import os
import numpy as np
from pathlib import Path
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models

SPECTROGRAM_DIR = "ml/spectrograms"
MODEL_DIR = "ml/models"
IMG_SIZE = 224
BATCH_SIZE = 8
EPOCHS = 20
LEARNING_RATE = 0.001

os.makedirs(MODEL_DIR, exist_ok=True)

SPECIES_LABELS = {
    "Haliaeetus_vocifer": 0,
    "Bostrychia_hagedash": 1,
    "Cuculus_solitarius": 2,
    "Ceryle_rudis": 3,
    "Milvus_migrans": 4,
    "Lophoceros_nasutus": 5,
    "Laniarius_aethiopicus": 6,
    "Pycnonotus_barbatus": 7,
    "Lamprotornis_superbus": 8,
    "Cossypha_heuglini": 9,
}

LABEL_TO_SPECIES = {v: k for k, v in SPECIES_LABELS.items()}

# Dataset
class SpectrogramDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img = Image.open(self.image_paths[idx]).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, self.labels[idx]

# Transforms
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def load_data():
    image_paths = []
    labels = []

    for species, label in SPECIES_LABELS.items():
        species_dir = os.path.join(SPECTROGRAM_DIR, species)
        if not os.path.exists(species_dir):
            print(f"  ✗ Missing: {species_dir}")
            continue
        files = list(Path(species_dir).glob("*.png"))
        for f in files:
            image_paths.append(str(f))
            labels.append(label)
        print(f"  ✓ {species}: {len(files)} spectrograms")

    return image_paths, labels

def build_model(num_classes):
    # Use pretrained ResNet18 — transfer learning
    model = models.resnet18(weights="IMAGENET1K_V1")

    # Freeze early layers
    for param in list(model.parameters())[:-10]:
        param.requires_grad = False

    # Replace final layer for our number of classes
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model

def train():
    print("Loading data...")
    image_paths, labels = load_data()
    print(f"\nTotal samples: {len(image_paths)}")

    # Split train/val
    X_train, X_val, y_train, y_val = train_test_split(
        image_paths, labels, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}, Val: {len(X_val)}")

    train_dataset = SpectrogramDataset(X_train, y_train, train_transform)
    val_dataset = SpectrogramDataset(X_val, y_val, val_transform)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    # Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nUsing device: {device}")

    model = build_model(num_classes=len(SPECIES_LABELS))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    best_val_acc = 0.0

    print("\nTraining...\n")
    for epoch in range(EPOCHS):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0

        for images, label_batch in train_loader:
            images, label_batch = images.to(device), label_batch.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, label_batch)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            train_correct += (outputs.argmax(1) == label_batch).sum().item()

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0

        with torch.no_grad():
            for images, label_batch in val_loader:
                images, label_batch = images.to(device), label_batch.to(device)
                outputs = model(images)
                loss = criterion(outputs, label_batch)
                val_loss += loss.item()
                val_correct += (outputs.argmax(1) == label_batch).sum().item()

        train_acc = train_correct / len(train_dataset)
        val_acc = val_correct / len(val_dataset)

        print(f"Epoch {epoch+1:02d}/{EPOCHS} | "
              f"Train Loss: {train_loss:.3f} | Train Acc: {train_acc:.2%} | "
              f"Val Loss: {val_loss:.3f} | Val Acc: {val_acc:.2%}")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), f"{MODEL_DIR}/best_model.pth")
            print(f"  ✓ Saved best model (val_acc={val_acc:.2%})")

        scheduler.step()

    print(f"\n✓ Training complete. Best val accuracy: {best_val_acc:.2%}")
    print(f"✓ Model saved to {MODEL_DIR}/best_model.pth")

if __name__ == "__main__":
    train()