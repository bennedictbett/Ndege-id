import os
import librosa
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

RAW_AUDIO_DIR = "data/raw"
SPECTROGRAM_DIR = "ml/spectrograms"
SAMPLE_RATE = 22050
DURATION = 5        # seconds per clip
N_MELS = 128        # mel bands
HOP_LENGTH = 512

os.makedirs(SPECTROGRAM_DIR, exist_ok=True)

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

def audio_to_spectrogram(audio_path, save_path):
    try:
        # Load audio, trim to DURATION seconds
        y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, duration=DURATION)

        # Pad if shorter than DURATION
        target_length = SAMPLE_RATE * DURATION
        if len(y) < target_length:
            y = np.pad(y, (0, target_length - len(y)))

        # Convert to mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=y, sr=sr, n_mels=N_MELS, hop_length=HOP_LENGTH
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        # Save as image
        plt.figure(figsize=(2.24, 2.24), dpi=100)
        plt.axis("off")
        librosa.display.specshow(mel_spec_db, sr=sr, hop_length=HOP_LENGTH)
        plt.tight_layout(pad=0)
        plt.savefig(save_path, bbox_inches="tight", pad_inches=0)
        plt.close()
        return True

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    total = 0
    errors = 0

    for species_folder, label in SPECIES_LABELS.items():
        audio_dir = os.path.join(RAW_AUDIO_DIR, species_folder)
        spec_dir = os.path.join(SPECTROGRAM_DIR, species_folder)
        os.makedirs(spec_dir, exist_ok=True)

        if not os.path.exists(audio_dir):
            print(f"  ✗ Missing: {audio_dir}")
            continue

        audio_files = list(Path(audio_dir).glob("*.mp3"))
        print(f"\n{species_folder} (label={label}): {len(audio_files)} files")

        for audio_path in audio_files:
            save_path = os.path.join(spec_dir, audio_path.stem + ".png")
            if os.path.exists(save_path):
                print(f"  Already exists: {audio_path.name}")
                total += 1
                continue
            success = audio_to_spectrogram(str(audio_path), save_path)
            if success:
                print(f"  ✓ {audio_path.name}")
                total += 1
            else:
                errors += 1

    print(f"\n✓ Done. {total} spectrograms created, {errors} errors.")

if __name__ == "__main__":
    main()