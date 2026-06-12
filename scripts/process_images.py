import os
from PIL import Image

INPUT_DIR = "data/images/raw"
OUTPUT_DIR = "data/images/processed"
MAX_WIDTH = 800
QUALITY = 85

os.makedirs(OUTPUT_DIR, exist_ok=True)

def process_image(filename):
    input_path = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    with Image.open(input_path) as img:
        # Convert to RGB (handles PNG with transparency)
        img = img.convert("RGB")
        
        # Resize if wider than MAX_WIDTH
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_size = (MAX_WIDTH, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Save compressed
        output_path = output_path.replace(".png", ".jpg")
        img.save(output_path, "JPEG", quality=QUALITY, optimize=True)
        
        size_kb = os.path.getsize(output_path) / 1024
        print(f"  ✓ {filename} → {img.width}x{img.height}px, {size_kb:.0f}KB")

def main():
    files = [f for f in os.listdir(INPUT_DIR) 
             if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    
    print(f"Processing {len(files)} images...")
    for f in files:
        process_image(f)
    print("✓ Done.")

if __name__ == "__main__":
    main()