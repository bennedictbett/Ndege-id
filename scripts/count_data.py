import sys
from pathlib import Path
sys.path.insert(0, ".")
from ml.labels import SPECIES_LABELS

raw, spec = Path("data/raw"), Path("ml/spectrograms")
rows = []
for sp in SPECIES_LABELS:
    n_audio = len(list((raw / sp).glob("*.mp3"))) if (raw / sp).exists() else 0
    n_png = len(list((spec / sp).glob("*.png"))) if (spec / sp).exists() else 0
    rows.append((n_audio, n_png, sp))
rows.sort()

print("species in labels.py:", len(SPECIES_LABELS))
print("species with audio  :", sum(1 for a, _, _ in rows if a > 0))
print("total recordings    :", sum(a for a, _, _ in rows))
print("total clips         :", sum(p for _, p, _ in rows))
print("\nfewest recordings first:")
for a, p, sp in rows[:25]:
    print(f"{a:4d} recordings {p:5d} clips  {sp}")