# Sauti Ndege 🦅

> AI-powered bird identification for East Africa

Sauti Ndege ("Bird Sound" in Swahili) is a mobile app that identifies East African birds by call or photo. Think Merlin Bird ID, but built specifically for Kenya, Tanzania, and Uganda — and designed around the connectivity reality of the region rather than assuming a constant connection.

---

## The Problem

Global bird ID apps like Merlin and eBird are excellent generalists — but that's also their limit. East African species are a small slice of a worldwide training set, "offline" mostly means "cached maps," and neither app is built around Swahili or East-African-specific usage patterns. Trying to out-build Cornell Lab's resources on raw model accuracy or species breadth isn't a fight a small project wins.

## The Solution

A narrower, more honest tool: a smaller species roster with real Kenyan context, transparent about which identifications come from a trained classifier versus a lighter heuristic, and built connectivity-first rather than connectivity-assumed — since patchy signal in the field is the norm, not an edge case, for a lot of actual birding locations here.

---

## Features

- 🎙️ **Sound Identification** — record a call, get a species match from a model trained specifically on this roster's spectrograms (ResNet18, not a generic audio classifier)
- 📸 **Photo Identification** — take or upload a photo, matched against reference photos via visual-similarity search. This is deliberately *not* presented as equivalent to the sound model: there's no trained photo classifier (no photo dataset large enough to train one), so results are labeled "Visual Similarity," not "AI Confidence," and accuracy is genuinely weaker on visually similar species (starlings, weavers, sunbirds) than on distinctive ones (fish eagle, hornbill, kingfishers)
- 📋 **Life List** — every identified species is added automatically, tracked locally on-device (no account system — see *Known Limitations*)
- 📍 **Nearby & Recent Sightings** — a live community feed of sightings other users have logged, with real photos and distance from your set location
- 🗺️ **Hotspots & Sightings Map** — browse known birding locations and see where sightings have been reported
- 📡 **Offline-first browsing** — species reference data is cached on-device after first load, so Browse, Life List's manual picker, and "similar species" all keep working with no connection
- 📥 **Offline capture queueing** — recording or photographing with no connection doesn't fail; the capture is saved locally and submitted automatically once you're back online, foreground-triggered (see *Known Limitations*)
- ⚙️ **A settings section that doesn't lie** — every row either does something real or is explicitly marked "Soon" with a reason (no adjustable audio-model params yet, no i18n infrastructure yet, etc.) rather than shipping placeholder toggles that look functional and aren't

---

## Architecture

```
Mobile App (React Native/Expo, runs on iOS, Android, and web)
        │
        ├── AsyncStorage (local-only: profile, Life List, settings, offline cache/queue)
        │
        └── FastAPI Backend (Render)
                │
                ├── Sound ID  → ResNet18 fine-tuned on mel spectrograms
                ├── Photo ID  → pretrained ResNet18 embeddings + cosine similarity
                │              against a precomputed reference table
                │
                └── Supabase (PostgreSQL + Storage)
```

There's no account system. The mobile app also queries Supabase directly for read-heavy data (recent/nearby sightings, species reference list) rather than always round-tripping through the backend — a deliberate choice to keep the backend's job scoped to the two things that actually need a server: running inference and writing sightings.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo (SDK 56) |
| Audio | `expo-audio` (migrated off `expo-av`, deprecated as of SDK 54) |
| Media | `expo-image-picker`, `expo-image-manipulator`, `expo-location` |
| Connectivity | `@react-native-community/netinfo` |
| Backend | FastAPI, Python |
| Sound ID Model | PyTorch, ResNet18 (fine-tuned), Librosa |
| Photo ID Model | PyTorch, ResNet18 (pretrained, ImageNet weights — not fine-tuned) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Deployment | Render |
| Audio Data | Xeno-canto API |

---

## ML Pipeline

### Sound Identification (trained)

```
Audio Recording (.m4a)  →  Mel Spectrogram (128 bands, 5s clips)  →  ResNet18 CNN (fine-tuned)  →  Species Prediction + Confidence
```

**Current performance:** 49 species, ~200 recordings, 75% validation accuracy. Training improves with more data per species — several species in the roster still have thin recording counts, and accuracy on those is correspondingly less reliable than the headline number suggests.

### Photo Identification (untrained — similarity search, not a classifier)

```
Reference photos  →  pretrained ResNet18 embeddings (offline, one-time)  →  cached embedding table
User's photo       →  same embedding  →  cosine similarity vs. cached table  →  best-matching species
```

This was a deliberate scope decision, not an oversight: training a real photo classifier needs a labeled photo dataset an order of magnitude larger than what exists for this roster, plus GPU training infrastructure this project doesn't have. Embedding similarity against reference photos needs neither — it works today, for free, using weights that ship with `torchvision` — at the cost of being meaningfully less accurate, especially on species that look alike. The tradeoff is stated explicitly in the app itself (see *Features*), not just here.

**Current coverage:** 27 of 49 species have reference photos embedded; the rest fall back to no photo-ID match until reference photos are added and `ml/build_photo_embeddings.py` is re-run.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/` | Health check |
| GET | `/birds` | All species with images |
| GET | `/birds/{id}` | Single species detail |
| GET | `/sightings/recent` | Recent community sightings, with coordinates |
| POST | `/identify` | Upload audio → species match (trained model) |
| POST | `/identify-photo` | Upload photo → species match (similarity search) |

**Live API:** `https://ndege-id.onrender.com`

---

## Current Species Coverage

- **49 species** have a trained sound-ID label (`ml/predict.py`)
- **27 of those 49** also have reference photos for photo-ID matching
- **50** is the working target for the next expansion phase (`data/birds.csv` is already scaffolded to that size)

---

## Project Structure

```
Ndege-id/
├── backend/                    FastAPI API server
│   └── main.py
├── ml/                         Machine learning pipeline
│   ├── prepare_data.py         Audio → spectrograms
│   ├── train.py                Sound model training
│   ├── predict.py              Sound ID inference
│   ├── build_photo_embeddings.py   Offline: builds the photo reference table
│   ├── predict_photo.py        Photo ID inference (similarity search)
│   └── models/                 Saved model weights + photo_embeddings.json
├── mobile/sauti-ndege/         React Native app
│   ├── App.js
│   ├── screens/                One file per screen (Home, Recording, PhotoIdentify, Profile, ...)
│   ├── components/             Shared UI (SettingsRow, OptionsSheet, EditProfileSheet, ...)
│   ├── constants/               theme.js, api.js, settingsKeys.js — single sources of truth,
│   │                            not values duplicated per screen
│   └── utils/                  attachLocation, birdsRepository, network, pendingQueue, geo
├── scripts/                    Data collection scripts
├── data/                       Audio and image data
└── template.py                 Project scaffolding
```

---

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- Expo Go app on your phone (or a browser — the app also runs via `expo start --web`)

### Backend Setup

```bash
git clone https://github.com/bennedictbett/Ndege-id.git
cd Ndege-id

python -m venv venv
venv\Scripts\activate      # Windows; use `source venv/bin/activate` on macOS/Linux

pip install -r requirements.txt

cp .env.example .env
# Add SUPABASE_URL, SUPABASE_KEY, XC_API_KEY

cd backend
uvicorn main:app --reload
```

### Mobile Setup

```bash
cd mobile/sauti-ndege
npm install
npx expo start -c
# Scan the QR code with Expo Go, or press `w` for the web preview
```

### Photo ID Reference Embeddings (one-time, and after any reference-photo change)

```bash
cd backend
python ../ml/build_photo_embeddings.py
```

This has to be run manually — it needs live Supabase credentials and network access to download every reference photo. `/identify-photo` fails with a clear message telling you to run this if the embeddings file doesn't exist yet.

### Data Pipeline (optional)

```bash
python scripts/download_xeno_canto.py     # Download bird recordings
python ml/prepare_data.py                  # Convert to spectrograms
python ml/train.py                         # Train the sound model
```

---

## Known Limitations

Stated explicitly rather than left for someone to discover:

- **No account system.** Life List and all preferences are local to the device. There's nothing to sync across devices, and no way to recover a Life List if the app is uninstalled. This was a deliberate scope decision for the MVP, not an oversight — but it's the first thing a "real product" version would need to address.
- **Photo ID is similarity search, not a classifier.** Covered above, but worth repeating: it will confidently return a *plausible* match even when wrong, especially within visually similar families. The UI labels this "Visual Similarity" specifically so the number isn't misread as calibrated confidence.
- **Offline capture queueing is foreground-only.** A capture made with no connection resolves the next time the app is *opened* with a connection — not the instant connectivity actually returns while the app is closed. True background sync would need `expo-task-manager`/background fetch, a meaningfully bigger and harder-to-verify addition that was deliberately deferred.
- **Sound model accuracy varies by species** in proportion to how many training recordings that species has — the 75% headline figure is an average, not a floor.
- **Community sightings have no identity or moderation layer.** Anyone can submit a sighting via `/identify` or `/identify-photo`; there's no way to distinguish a careful observation from a mistaken one, or to attribute it to a person.

---

## Future Product Improvements

The realistic differentiation angle against Merlin/eBird isn't "more species" or "higher accuracy" — that's a resource fight this project doesn't win. It's the things a global generalist app is structurally unlikely to prioritize:

- **True offline identification (on-device ML).** The biggest lever, and the biggest lift: converting both models to a mobile format (ONNX or TFLite), bundling weights into the app, and — the genuinely hard part — reimplementing the audio→spectrogram preprocessing (currently Python/`librosa`) in JavaScript, since that step has to run before the model ever sees the audio. Photo ID would be more tractable here than sound, since it has no equivalent preprocessing step.
- **Swahili and local vernacular bird names.** Real i18n infrastructure is its own project, but this is plausibly the single highest-leverage differentiator: East African language support is exactly the kind of thing a globally-scoped app is unlikely to invest in deeply.
- **Closing the photo-ID coverage gap** (27 → 49 species) by sourcing more reference photos per species, and eventually training a real classifier once enough labeled photo data exists — the honest long-term fix for the similarity-search tradeoff above, not a permanent state.
- **Expanding the roster past 50 species** with a deliberate quality bar: more recordings per species before adding it, rather than optimizing for species count over per-species reliability.
- **A lightweight identity layer** (still no full accounts) — enough to let someone recover their Life List on a new device, without building the account-system complexity that was intentionally scoped out of the MVP.
- **Local community features** — hotspots, meetups, rarity alerts scoped to Kenya specifically — leaning into local depth rather than competing on global breadth.

---

## Data Sources

- **Audio:** [Xeno-canto](https://xeno-canto.org) (CC licensed recordings)
- **Images:** [Wikimedia Commons](https://commons.wikimedia.org) (CC licensed photos)
- **Species Info:** Manual curation

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for East Africa 🌍 by Benedict Bett*