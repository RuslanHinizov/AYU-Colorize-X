"""
Microsoft Old Photo Restoration Model Downloader

Azure blob'a erişim yoksa, bu script alternatif kaynaklardan indirir.
"""
import os
import sys
import urllib.request
import zipfile
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent / "Bringing-Old-Photos-Back-to-Life"

# Primary URLs (Azure - may be blocked in some regions)
AZURE_URLS = {
    "global": "https://facevc.blob.core.windows.net/zhanbo/old_photo/pretrain/Global/checkpoints.zip",
    "face": "https://facevc.blob.core.windows.net/zhanbo/old_photo/pretrain/Face_Enhancement/checkpoints.zip",
}

# Alternative mirrors - GitHub releases (larger but works everywhere)
MIRROR_URLS = {
    "global": [
        "https://github.com/microsoft/Bringing-Old-Photos-Back-to-Life/releases/download/v1.0/global_checkpoints.zip",
    ],
    "face": [
        "https://github.com/microsoft/Bringing-Old-Photos-Back-to-Life/releases/download/v1.0/face_checkpoints.zip",
    ]
}

def download_with_progress(url, dest_path, desc=""):
    """Download file with progress indicator"""
    print(f"Downloading {desc}...")
    print(f"URL: {url}")
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req, timeout=600) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            downloaded = 0
            block_size = 65536  # 64KB blocks for faster download
            
            with open(dest_path, 'wb') as f:
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    downloaded += len(buffer)
                    f.write(buffer)
                    
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        mb_down = downloaded / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        print(f"\r  {mb_down:.1f} / {mb_total:.1f} MB ({percent:.1f}%)", end="", flush=True)
            
            print()  # New line
            return True
            
    except Exception as e:
        print(f"  Failed: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


def download_global_checkpoints():
    """Download Global restoration checkpoints"""
    dest_dir = BASE_DIR / "Global" / "checkpoints"
    
    if dest_dir.exists() and any(dest_dir.iterdir()):
        print("Global checkpoints already exist!")
        return True
    
    zip_path = BASE_DIR / "Global" / "checkpoints.zip"
    
    # Try Azure first
    if download_with_progress(AZURE_URLS["global"], zip_path, "Global checkpoints"):
        print("Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(BASE_DIR / "Global")
        os.remove(zip_path)
        print("Global checkpoints ready!")
        return True
    
    # Try mirrors
    for mirror_url in MIRROR_URLS.get("global", []):
        if download_with_progress(mirror_url, zip_path, "Global checkpoints (mirror)"):
            print("Extracting...")
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(BASE_DIR / "Global")
            os.remove(zip_path)
            print("Global checkpoints ready!")
            return True
    
    print("ERROR: Could not download Global checkpoints!")
    print("Please download manually from:")
    print(f"  {AZURE_URLS['global']}")
    print(f"And extract to: {dest_dir}")
    return False


def download_face_checkpoints():
    """Download Face Enhancement checkpoints"""
    dest_dir = BASE_DIR / "Face_Enhancement" / "checkpoints"
    
    if dest_dir.exists() and any(dest_dir.iterdir()):
        print("Face checkpoints already exist!")
        return True
    
    zip_path = BASE_DIR / "Face_Enhancement" / "checkpoints.zip"
    
    # Try Azure first
    if download_with_progress(AZURE_URLS["face"], zip_path, "Face Enhancement checkpoints"):
        print("Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(BASE_DIR / "Face_Enhancement")
        os.remove(zip_path)
        print("Face checkpoints ready!")
        return True
    
    # Try mirrors
    for mirror_url in MIRROR_URLS.get("face", []):
        if download_with_progress(mirror_url, zip_path, "Face checkpoints (mirror)"):
            print("Extracting...")
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(BASE_DIR / "Face_Enhancement")
            os.remove(zip_path)
            print("Face checkpoints ready!")
            return True
    
    print("ERROR: Could not download Face checkpoints!")
    print("Please download manually from:")
    print(f"  {AZURE_URLS['face']}")
    print(f"And extract to: {dest_dir}")
    return False


def main():
    print("=" * 60)
    print("Microsoft Old Photo Restoration - Model Downloader")
    print("=" * 60)
    print()
    
    if not BASE_DIR.exists():
        print(f"ERROR: {BASE_DIR} not found!")
        print("Please clone the repo first:")
        print("  git clone https://github.com/microsoft/Bringing-Old-Photos-Back-to-Life.git")
        return 1
    
    success = True
    
    print("[1/2] Global Checkpoints (~200 MB)")
    print("-" * 40)
    if not download_global_checkpoints():
        success = False
    print()
    
    print("[2/2] Face Enhancement Checkpoints (~400 MB)")
    print("-" * 40)
    if not download_face_checkpoints():
        success = False
    print()
    
    if success:
        print("=" * 60)
        print("All models downloaded successfully!")
        print("=" * 60)
        return 0
    else:
        print("=" * 60)
        print("Some downloads failed. Please download manually.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
