import os

FOLDERS = [
    "data/raw",
    "data/processed",
    "data/images/raw",
    "data/images/processed",
    "backend",
    "mobile",
    "scripts",
    "ml/spectrograms",
    "ml/models",
]

GITKEEPS = [
    "data/raw/.gitkeep",
    "data/processed/.gitkeep",
    "data/images/raw/.gitkeep",
    "data/images/processed/.gitkeep",
    "ml/spectrograms/.gitkeep",
    "ml/models/.gitkeep",
]

FILES = {
    "backend/__init__.py": "",
    "ml/__init__.py": "",
    "scripts/__init__.py": "",
}

def create_structure():
    print("Creating Ndege-ID project structure...\n")

    for folder in FOLDERS:
        os.makedirs(folder, exist_ok=True)
        print(f"  ✓ {folder}/")

    for gitkeep in GITKEEPS:
        if not os.path.exists(gitkeep):
            open(gitkeep, "w").close()
            print(f"  ✓ {gitkeep}")

    for filepath, content in FILES.items():
        if not os.path.exists(filepath):
            with open(filepath, "w") as f:
                f.write(content)
            print(f"  ✓ {filepath}")

    print("\n✓ Project structure ready.")

if __name__ == "__main__":
    create_structure()