"""
Test script: Video renklendirme - DeOldify ile
"""
import sys
import os
from pathlib import Path

# Backend dizinini path'e ekle
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(Path(__file__).parent)

input_video = r"C:\Users\rusla\Desktop\ALL-Project\AYU-ColorizeX-Diplom\test video.mp4"
output_video = r"C:\Users\rusla\Desktop\ALL-Project\AYU-ColorizeX-Diplom\test_video_colored.mp4"

if not Path(input_video).exists():
    print(f"[HATA] Video dosyasi bulunamadi: {input_video}")
    sys.exit(1)

print(f"[OK] Girdi video: {input_video}")
print(f"[OK] Cikti video: {output_video}")
print()

def progress(p):
    bar = "#" * (p // 5)
    print(f"\r  [{bar:<20}] %{p}", end="", flush=True)
    if p >= 95:
        print()

print("[1/4] AI motoru yukleniyor...")
from services.ai_engine import colorize_video
print("[1/4] AI motoru yuklendi.")

print("[2/4] DeOldify modeli yukleniypr (ilk seferinde uzun surebilir)...")
print("[3/4] Video renklendirilmeye basliyor...\n")

import time
start = time.time()

try:
    elapsed = colorize_video(
        input_path=input_video,
        output_path=output_video,
        render_factor=21,
        device="cpu",
        progress_callback=progress
    )
    print(f"\n[4/4] TAMAMLANDI!")
    print(f"  Islem suresi : {elapsed:.1f} saniye")
    print(f"  Cikti dosyasi: {output_video}")
    print(f"  Dosya boyutu : {Path(output_video).stat().st_size / 1024 / 1024:.1f} MB")
except Exception as e:
    print(f"\n[HATA] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
