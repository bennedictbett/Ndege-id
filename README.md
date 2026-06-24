# Sauti Ndege 🦅

> AI-powered bird identification for East Africa

Sauti Ndege ("Bird Sound" in Swahili) is a mobile app that identifies East African birds by their calls in real time. Think Shazam, but for birds in Kenya, Tanzania, and Uganda.

---

## The Problem

Existing bird identification apps like Merlin Bird ID work globally, but East African birds are underrepresented in training data, recordings, and local context compared to North America and Europe.

## The Solution

A focused tool built specifically for East Africa — trained on Kenyan bird calls, designed for field conditions, and built with local birders, students, researchers, and nature enthusiasts in mind.

---

## Features

- 🎙️ **Record & Identify** — Hold to record a bird call, get instant species identification
- 📊 **Confidence Score** — Know how certain the AI is, with top 3 predictions
- 🦅 **Browse Species** — Explore all 10 species with photos and descriptions
- 📋 **Life List** — Track every species you've seen, auto-added on identification
- 🌍 **East Africa Focus** — Trained on recordings from Kenya, Tanzania, and Uganda

---

## Architecture
Mobile App (React Native/Expo)

↓

FastAPI Backend (Railway)

↓

AI Model (ResNet18 fine-tuned on mel spectrograms)

↓

Supabase (PostgreSQL + Storage)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo |
| Backend | FastAPI, Python |
| ML Model | PyTorch, ResNet18, Librosa |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Deployment | Railway |
| Audio Data | Xeno-canto API |

---

## ML Pipeline
Audio Recording (.mp3)

↓

Mel Spectrogram (128 bands, 5s clips)

↓

ResNet18 CNN (pretrained, fine-tuned)

↓

Species Prediction + Confidence Score

**Current Performance:**
- 10 species, 200 recordings
- 75% validation accuracy
- Training improves with more data

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/birds` | All species with images |
| GET | `/birds/{id}` | Single species detail |
| POST | `/identify` | Upload audio → get species |

**Live API:** `https://ndege-id-production.up.railway.app`

---

## Current Species (MVP — 10)

1. African Fish Eagle
2. Hadada Ibis
3. Red-chested Cuckoo
4. Pied Kingfisher
5. Black Kite
6. African Grey Hornbill
7. Tropical Boubou
8. Common Bulbul
9. Superb Starling
10. White-browed Robin-Chat

---

## Project Structure
Ndege-id/

├── backend/          ← FastAPI API server

│   └── main.py

├── ml/               ← Machine learning pipeline

│   ├── prepare_data.py   ← Audio → spectrograms

│   ├── train.py          ← Model training

│   ├── predict.py        ← Inference

│   └── models/           ← Saved model weights

├── mobile/           ← React Native app

│   └── sauti-ndege/

│       ├── App.js

│       └── screens/

├── scripts/          ← Data collection scripts

│   ├── download_xeno_canto.py

│   ├── populate_birds.py

│   ├── process_images.py

│   └── upload_images.py

├── data/             ← Audio and image data

│   ├── raw/          ← Downloaded recordings

│   ├── processed/    ← Cleaned spectrograms

│   └── birds.csv

└── template.py       ← Project scaffolding

---

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- Expo Go app on your phone

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/benedictbett/Ndege-id.git
cd Ndege-id

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Add your SUPABASE_URL, SUPABASE_KEY, XC_API_KEY

# Run the API
cd backend
uvicorn main:app --reload
```

### Mobile Setup

```bash
cd mobile/sauti-ndege
npm install
npm start
# Scan QR code with Expo Go
```

### Data Pipeline (optional)

```bash
# Download bird recordings
python scripts/download_xeno_canto.py

# Convert to spectrograms
python ml/prepare_data.py

# Train model
python ml/train.py
```

---

## Roadmap

- [x] Dataset (200 recordings, 10 species)
- [x] Bird database (Supabase)
- [x] ML model (ResNet18, 75% accuracy)
- [x] FastAPI backend (deployed)
- [x] React Native app
- [x] Life List feature
- [ ] Expand to 50 species
- [ ] Passive ambient listening
- [ ] Offline mode (on-device model)
- [ ] Distribution maps
- [ ] Community sightings

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