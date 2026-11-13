"""
ml/train.py: recording-aware split, safer augmentation, honest metrics.

Run from the repo root:   python ml/train.py
The roster is every species in ml/labels.py that has at least MIN_RECORDINGS recordings
in ml/spectrograms; class indices are re-numbered 0..K-1 over that roster (saved in the
checkpoint under "classes").
Saves to ml/models/best_model_v2.pth (does NOT overwrite best_model.pth,
so your deployed backend keeps working until you switch it over).
"""
import json
import os
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ml.labels import SPECIES_LABELS  # noqa: E402

SPECTROGRAM_DIR = str(ROOT / "ml" / "spectrograms")
MODEL_DIR = str(ROOT / "ml" / "models")
IMG_SIZE = 224
os.makedirs(MODEL_DIR, exist_ok=True)

BATCH_SIZE = 16
EPOCHS = 40
PATIENCE = 8          # stop if val macro-F1 doesn't improve for this many epochs
LR_HEAD = 1e-3
LR_BACKBONE = 1e-4
SEED = 42
MODEL_VERSION = "v2"
MIN_RECORDINGS = 10   # species with fewer recordings are excluded (too few to split)

torch.manual_seed(SEED)
np.random.seed(SEED)


# ---------------------------------------------------------------- data
def recording_id(path: Path) -> str:
    # prepare_data.py names clips "<recordingID>_<windowIndex>.png", e.g. 123456_3.png.
    # (Old one-clip-per-recording files like 123456.png also work: whole stem = group.)
    return f"{path.parent.name}/{path.stem.rsplit('_', 1)[0]}"


def load_data():
    by_species = {}
    for species in SPECIES_LABELS:
        d = Path(SPECTROGRAM_DIR) / species
        files = sorted(d.glob("*.png")) if d.exists() else []
        if files:
            by_species[species] = files

    roster, dropped = [], []
    for species, files in by_species.items():
        n_rec = len({recording_id(f) for f in files})
        (roster if n_rec >= MIN_RECORDINGS else dropped).append((species, n_rec))
    class_names = sorted(s for s, _ in roster)
    index = {s: i for i, s in enumerate(class_names)}
    print(f"Roster: {len(class_names)} species with >= {MIN_RECORDINGS} recordings")
    if dropped:
        print("Excluded (too few recordings): "
              + ", ".join(f"{s} ({n})" for s, n in sorted(dropped)))

    paths, labels, groups = [], [], []
    for species in class_names:
        for f in by_species[species]:
            paths.append(str(f))
            labels.append(index[species])
            groups.append(recording_id(f))
    paths, labels, groups = np.array(paths), np.array(labels), np.array(groups)
    n_rec = len(set(groups))
    print(f"{len(paths)} clips from {n_rec} recordings")
    if n_rec == len(paths):
        print("NOTE: one clip per recording (old-style spectrograms). Re-run "
              "prepare_data.py after deleting ml/spectrograms to get several clips "
              "per recording.")
    return paths, labels, groups, class_names


def group_split(paths, labels, groups):
    """~60% train / 20% val / 20% test, never splitting a recording across sets."""
    outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    rest, test = next(outer.split(paths, labels, groups))
    inner = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED)
    tr, va = next(inner.split(paths[rest], labels[rest], groups[rest]))
    return rest[tr], rest[va], test


# ---------------------------------------------------------------- augmentation
class RandomTimeShift:
    """Roll along the time axis (width). Replaces horizontal flip, which
    would play the call backwards."""
    def __call__(self, x):
        limit = x.shape[2] // 5
        return torch.roll(x, int(np.random.randint(-limit, limit + 1)), dims=2)


class TimeFreqMask:
    """SpecAugment-style stripes. Assumes height = frequency, width = time."""
    def __init__(self, max_frac=0.15, n=2):
        self.max_frac, self.n = max_frac, n

    def __call__(self, x):
        x = x.clone()
        _, H, W = x.shape
        fill = x.mean()
        for _ in range(self.n):
            w = int(np.random.uniform(0, self.max_frac) * W)
            s = np.random.randint(0, max(1, W - w))
            x[:, :, s:s + w] = fill
            h = int(np.random.uniform(0, self.max_frac) * H)
            s = np.random.randint(0, max(1, H - h))
            x[:, s:s + h, :] = fill
        return x


NORM = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])

train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    RandomTimeShift(),
    TimeFreqMask(),
    NORM,
])
eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    NORM,
])


class SpectrogramDataset(Dataset):
    def __init__(self, paths, labels, transform):
        self.paths, self.labels, self.transform = paths, labels, transform

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, i):
        img = Image.open(self.paths[i]).convert("RGB")
        return self.transform(img), int(self.labels[i])


# ---------------------------------------------------------------- model
def build_model(num_classes):
    m = models.resnet18(weights="IMAGENET1K_V1")
    for name, p in m.named_parameters():
        p.requires_grad = name.startswith("layer4")      # train layer4 + new head
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


@torch.no_grad()
def predict(model, loader, device):
    model.eval()
    outs, ys = [], []
    for x, y in loader:
        outs.append(model(x.to(device)).cpu())
        ys.append(y)
    return torch.cat(outs), torch.cat(ys)


# ---------------------------------------------------------------- main
def train():
    paths, labels, groups, class_names = load_data()
    tr, va, te = group_split(paths, labels, groups)

    # Save the split so the experiment can be reproduced and audited.
    split = {"seed": SEED, "min_recordings": MIN_RECORDINGS, "classes": class_names,
             "train": sorted(set(groups[tr])), "val": sorted(set(groups[va])),
             "test": sorted(set(groups[te]))}
    s_tr, s_va, s_te = set(split["train"]), set(split["val"]), set(split["test"])
    assert not (s_tr & s_va or s_tr & s_te or s_va & s_te), "a recording is in two splits"
    Path(MODEL_DIR, "split_v2.json").write_text(json.dumps(split, indent=2))
    print(f"Train {len(tr)} | Val {len(va)} | Test {len(te)} clips "
          f"({len(set(groups[tr]))}/{len(set(groups[va]))}/{len(set(groups[te]))} recordings)")

    mk = lambda idx, tf, shuffle: DataLoader(
        SpectrogramDataset(paths[idx], labels[idx], tf),
        batch_size=BATCH_SIZE, shuffle=shuffle, num_workers=0)
    train_loader, val_loader, test_loader = mk(tr, train_transform, True), \
        mk(va, eval_transform, False), mk(te, eval_transform, False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    n_cls = len(class_names)
    model = build_model(n_cls).to(device)

    majority = int(np.bincount(labels[tr], minlength=n_cls).argmax())
    base_majority = float((labels[te] == majority).mean())
    base_chance = 1.0 / n_cls
    print(f"Baselines on test -> majority class: {base_majority:.1%} | "
          f"uniform chance: {base_chance:.1%}")

    counts = np.maximum(np.bincount(labels[tr], minlength=n_cls), 1)
    weights = torch.tensor(len(tr) / (n_cls * counts), dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.1)

    optimizer = optim.AdamW([
        {"params": [p for n, p in model.named_parameters() if n.startswith("layer4")],
         "lr": LR_BACKBONE},
        {"params": model.fc.parameters(), "lr": LR_HEAD},
    ], weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    ckpt = f"{MODEL_DIR}/best_model_v2.pth"
    best_f1, bad_epochs = -1.0, 0

    for epoch in range(EPOCHS):
        model.train()
        run_loss, correct = 0.0, 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            run_loss += loss.item() * len(y)
            correct += (out.argmax(1) == y).sum().item()
        scheduler.step()

        v_logits, v_y = predict(model, val_loader, device)
        v_pred = v_logits.argmax(1)
        v_acc = (v_pred == v_y).float().mean().item()
        v_f1 = f1_score(v_y, v_pred, average="macro", zero_division=0)
        print(f"Epoch {epoch+1:02d}/{EPOCHS} | train loss {run_loss/len(tr):.3f} "
              f"acc {correct/len(tr):.1%} | val acc {v_acc:.1%} macro-F1 {v_f1:.3f}")

        if v_f1 > best_f1:
            best_f1, bad_epochs = v_f1, 0
            torch.save({"state_dict": model.state_dict(),
                        "classes": dict(enumerate(class_names)),
                        "img_size": IMG_SIZE,
                        "model_version": MODEL_VERSION}, ckpt)
            print("  saved best model")
        else:
            bad_epochs += 1
            if bad_epochs >= PATIENCE:
                print("Early stopping.")
                break

    # ----- final evaluation on the untouched test set
    model.load_state_dict(torch.load(ckpt, map_location=device)["state_dict"])
    logits, y = predict(model, test_loader, device)
    probs = torch.softmax(logits, 1)
    conf, pred = probs.max(1)
    y_np, p_np = y.numpy(), pred.numpy()

    present = sorted(set(y_np) | set(p_np))
    report = classification_report(
        y_np, p_np, labels=present,
        target_names=[class_names[i] for i in present], zero_division=0)
    print("\n=== TEST SET ===\n" + report)
    Path(MODEL_DIR, "test_report_v2.txt").write_text(report)

    per_species = classification_report(
        y_np, p_np, labels=present, target_names=[class_names[i] for i in present],
        zero_division=0, output_dict=True)
    results = {
        "seed": SEED,
        "n_species": n_cls,
        "n_test_clips": int(len(y_np)),
        "n_test_recordings": int(len(set(groups[te]))),
        "test_accuracy": float(accuracy_score(y_np, p_np)),
        "test_macro_f1": float(f1_score(y_np, p_np, average="macro", zero_division=0)),
        "baseline_majority_class": base_majority,
        "baseline_uniform_chance": base_chance,
        "per_species": {k: v for k, v in per_species.items()
                        if k not in ("accuracy", "macro avg", "weighted avg")},
    }
    Path(MODEL_DIR, "results_v2.json").write_text(json.dumps(results, indent=2))
    print(f"Test accuracy {results['test_accuracy']:.1%} | macro-F1 "
          f"{results['test_macro_f1']:.3f} (see results_v2.json)")

    print("Most common confusions (true -> predicted):")
    pairs = Counter((class_names[a], class_names[b])
                    for a, b in zip(y_np, p_np) if a != b)
    for (a, b), n in pairs.most_common(15):
        print(f"  {n:3d}x  {a} -> {b}")

    print("\nConfidence threshold trade-off (for an 'unknown' answer):")
    for t in (0.3, 0.5, 0.6, 0.7, 0.8, 0.9):
        keep = conf >= t
        cov = keep.float().mean().item()
        acc = (pred[keep] == y[keep]).float().mean().item() if keep.any() else float("nan")
        print(f"  threshold {t:.1f}: answers {cov:.0%} of clips, {acc:.1%} correct")


if __name__ == "__main__":
    train()