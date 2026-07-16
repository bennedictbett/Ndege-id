from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client

import os
import sys
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.predict import predict

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI(
    title="Ndege ID API",
    description="AI-powered bird identification for East Africa",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Ndege ID API is running 🦅"}

@app.get("/birds")
def get_birds():
    birds = supabase.table("birds").select("*").execute()
    images = supabase.table("bird_images").select("*").execute()

    # Group images by bird_id
    images_by_bird = {}
    for img in images.data:
        bird_id = img["bird_id"]
        if bird_id not in images_by_bird:
            images_by_bird[bird_id] = []
        images_by_bird[bird_id].append(img)

    # Attach images to each bird
    result = []
    for bird in birds.data:
        bird["images"] = images_by_bird.get(bird["id"], [])
        result.append(bird)

    return {"birds": result, "count": len(result)}

@app.get("/birds/{bird_id}")
def get_bird(bird_id: int):
    bird = supabase.table("birds").select("*").eq("id", bird_id).execute()
    if not bird.data:
        return {"error": "Bird not found"}

    images = supabase.table("bird_images").select("*").eq("bird_id", bird_id).execute()

    result = bird.data[0]
    result["images"] = images.data
    return result

@app.get("/sightings/recent")
def get_recent_sightings(limit: int = 10):
    sightings = supabase.table("sightings")\
        .select("*, birds(*)")\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    return {"sightings": sightings.data}

@app.post("/identify")
async def identify_bird(
    audio: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    location_name: str = Form(None),
):
    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    try:
        # Run prediction
        result = predict(tmp_path)

        # Get bird details from database
        scientific_name = result["scientific_name"].replace("_", " ")
        bird_response = supabase.table("birds")\
            .select("*")\
            .eq("scientific_name", scientific_name)\
            .execute()

        bird_data = bird_response.data[0] if bird_response.data else None

        # Get bird images
        if bird_data:
            images = supabase.table("bird_images")\
                .select("*")\
                .eq("bird_id", bird_data["id"])\
                .execute()
            bird_data["images"] = images.data

            # Save the sighting
            supabase.table("sightings").insert({
                "bird_id": bird_data["id"],
                "confidence": result["confidence"],
                "latitude": latitude,
                "longitude": longitude,
                "location_name": location_name,
            }).execute()

        return {
            "prediction": result,
            "bird": bird_data
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        os.unlink(tmp_path)