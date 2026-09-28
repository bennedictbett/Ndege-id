"""
ml/prepare_data.py: turn each recording into several 5s mel-spectrogram PNGs.

Run from the repo root:  python ml/prepare_data.py

Changes from the old version:
- Uses up to MAX_CLIPS_PER_RECORDING of the LOUDEST 5s windows in the first
  MAX_SECONDS_PER_RECORDING seconds, instead of only the first 5 seconds
  (which is often silence or a spoken intro). Loud is not always "bird", but
  it is a much better bet than the start of the file.
- Files are named <recordingID>_<windowIndex>.png so train_v2.py can keep all
  clips from one recording on the same side of the train/val/test split.
- Image rendering is IDENTICAL to before (same figure size, same specshow), so
  your backend's inference preprocessing still matches.
- Runs in parallel across CPU cores.

Tip: delete ml/spectrograms first so old one-clip-per-recording PNGs
(<id>.png) don't mix with the new ones.
"""
import os
import sys
from multiprocessing import Pool
from pathlib import Path

import librosa
import librosa.display
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ml.labels import SPECIES_LABELS  # noqa: E402

RAW_AUDIO_DIR = ROOT / "data" / "raw"
SPECTROGRAM_DIR = ROOT / "ml" / "spectrograms"
SAMPLE_RATE = 22050
DURATION = 5                    # seconds per clip
N_MELS = 128
HOP_LENGTH = 512
MAX_SECONDS_PER_RECORDING = 90  # only look at the first 90s of each file
MAX_CLIPS_PER_RECORDING = 8
MIN_RMS = 1e-3                  # windows quieter than this count as silence
WORKERS = max(1, (os.cpu_count() or 2) - 1)


def pick_windows(y):
    """Return [(window_index, samples)] for the loudest non-silent windows."""
    n = SAMPLE_RATE * DURATION
    if len(y) < n:
        return [(0, np.pad(y, (0, n - len(y))))]
    count = len(y) // n
    windows = [y[i * n:(i + 1) * n] for i in range(count)]
    rms = np.array([np.sqrt(np.mean(w ** 2)) for w in windows])
    order = np.argsort(rms)[::-1][:MAX_CLIPS_PER_RECORDING]
    keep = sorted(int(i) for i in order if rms[i] >= MIN_RMS)
    if not keep:                       # whole recording is very quiet
        keep = [int(order[0])]
    return [(i, windows[i]) for i in keep]


def render(window, save_path):
    mel = librosa.feature.melspectrogram(
        y=window, sr=SAMPLE_RATE, n_mels=N_MELS, hop_length=HOP_LENGTH)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    fig = plt.figure(figsize=(2.24, 2.24), dpi=100)
    plt.axis("off")
    librosa.display.specshow(mel_db, sr=SAMPLE_RATE, hop_length=HOP_LENGTH)
    plt.tight_layout(pad=0)
    fig.savefig(save_path, bbox_inches="tight", pad_inches=0)
    plt.close(fig)


def process(task):
    audio_path, spec_dir = task
    audio_path, spec_dir = Path(audio_path), Path(spec_dir)
    if any(spec_dir.glob(f"{audio_path.stem}_*.png")):
        return audio_path.name, 0, None            # already done
    try:
        y, _ = librosa.load(str(audio_path), sr=SAMPLE_RATE,
                            duration=MAX_SECONDS_PER_RECORDING, mono=True)
        made = 0
        for idx, window in pick_windows(y):
            render(window, spec_dir / f"{audio_path.stem}_{idx}.png")
            made += 1
        return audio_path.name, made, None
    except Exception as e:                          # noqa: BLE001
        return audio_path.name, 0, str(e)


def main():
    tasks = []
    for species in SPECIES_LABELS:
        audio_dir = RAW_AUDIO_DIR / species
        if not audio_dir.exists():
            print(f"  x Missing: {audio_dir}")
            continue
        spec_dir = SPECTROGRAM_DIR / species
        spec_dir.mkdir(parents=True, exist_ok=True)
        tasks += [(str(p), str(spec_dir)) for p in sorted(audio_dir.glob("*.mp3"))]

    print(f"{len(tasks)} recordings, {WORKERS} workers")
    made_total, errors = 0, []
    with Pool(WORKERS) as pool:
        for i, (name, made, err) in enumerate(pool.imap_unordered(process, tasks, chunksize=4), 1):
            made_total += made
            if err:
                errors.append((name, err))
            if i % 100 == 0:
                print(f"  {i}/{len(tasks)} recordings processed, {made_total} new clips")

    print(f"\nDone. {made_total} new spectrograms, {len(errors)} errors.")
    for name, err in errors[:20]:
        print(f"  x {name}: {err}")

    print("\nClips per species (fewest first):")
    counts = {s: len(list((SPECTROGRAM_DIR / s).glob("*.png"))) for s in SPECIES_LABELS
              if (SPECTROGRAM_DIR / s).exists()}
    for s, n in sorted(counts.items(), key=lambda kv: kv[1])[:15]:
        print(f"  {s}: {n}")


if __name__ == "__main__":
    main()