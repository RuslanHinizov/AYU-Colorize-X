"""
Compatibility runner for the upstream VQFR demo.

The VQFR repository imports BasicSR, and BasicSR 1.4 expects
``torchvision.transforms.functional_tensor``. That module was removed in newer
torchvision versions. Keeping the shim here isolates the research-code patch
from the main FastAPI process.
"""
from __future__ import annotations

import argparse
import os
import runpy
import sys
import types
from pathlib import Path


def _patch_torchvision_functional_tensor() -> None:
    try:
        import torchvision.transforms.functional as functional
    except Exception:
        return

    module = types.ModuleType("torchvision.transforms.functional_tensor")
    module.rgb_to_grayscale = functional.rgb_to_grayscale
    sys.modules["torchvision.transforms.functional_tensor"] = module


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-dir", required=True)
    args, demo_args = parser.parse_known_args()

    repo_dir = Path(args.repo_dir).resolve()
    demo_path = repo_dir / "demo.py"
    if not demo_path.is_file():
        raise FileNotFoundError(f"VQFR demo.py bulunamadi: {demo_path}")

    _patch_torchvision_functional_tensor()
    os.chdir(repo_dir)
    sys.path.insert(0, str(repo_dir))
    sys.argv = ["demo.py", *demo_args]
    runpy.run_path(str(demo_path), run_name="__main__")


if __name__ == "__main__":
    main()
