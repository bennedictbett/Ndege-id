from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client
import os

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