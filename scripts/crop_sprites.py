#!/usr/bin/env python3
"""Crop pipe sprite sheet into individual PNG assets."""

from PIL import Image
import json, os

SRC = "/home/z/my-project/upload/ChatGPT Image Aug 9, 2026, 10_45_54 PM.png"
OUT_DIR = "/home/z/my-project/public/pipes"

# Coordinates from VLM analysis (x_start, y_start, x_end, y_end)
# Each piece is cropped with a small padding for clean edges
PIECES = {
    # Row 1: Empty Pipes
    "straight-h":    (14, 53, 146, 193),
    "straight-v":    (158, 53, 290, 193),
    "bend-TR":       (302, 53, 434, 193),
    "bend-RB":       (446, 53, 578, 193),
    "bend-BL":       (590, 53, 722, 193),
    "bend-LT":       (734, 53, 866, 193),
    # Row 2: Empty Pipes (tees, cross, stubs)
    "T-up":          (14, 218, 146, 358),
    "T-right":       (158, 218, 290, 358),
    "T-down":        (302, 218, 434, 358),
    "T-left":        (446, 218, 578, 358),
    "cross-empty":   (590, 218, 722, 358),
    "stub-up":       (734, 218, 866, 358),
    "stub-right":    (878, 218, 1010, 358),
    "stub-down":     (1022, 218, 1154, 358),
    "stub-left":     (1166, 218, 1298, 358),
    # Row 3: Blue Filled Pipes
    "straight-h-filled":    (14, 409, 146, 549),
    "straight-v-filled":    (158, 409, 290, 549),
    "bend-TR-filled":       (302, 409, 434, 549),
    "bend-RB-filled":       (446, 409, 578, 549),
    "bend-BL-filled":       (590, 409, 722, 549),
    "bend-LT-filled":       (734, 409, 866, 549),
    # Row 4: Blue Filled Pipes (tees, cross, stubs)
    "T-up-filled":          (14, 574, 146, 714),
    "T-right-filled":       (158, 574, 290, 714),
    "T-down-filled":        (302, 574, 434, 714),
    "T-left-filled":        (446, 574, 578, 714),
    "cross-filled":         (590, 574, 722, 714),
    "stub-up-filled":       (734, 574, 866, 714),
    "stub-right-filled":    (878, 574, 1010, 714),
    "stub-down-filled":     (1022, 574, 1154, 714),
    "stub-left-filled":     (1166, 574, 1298, 714),
    # Row 5: Special Pieces (source, drain)
    "source-up":     (14, 779, 146, 919),
    "source-right":  (158, 779, 290, 919),
    "source-down":  (302, 779, 434, 919),
    "source-left":  (446, 779, 578, 919),
    "drain-up":      (594, 779, 726, 919),
    "drain-right":   (738, 779, 870, 919),
    "drain-down":    (882, 779, 1014, 919),
    "drain-left":    (1026, 779, 1158, 919),
}

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(SRC)
    print(f"Sprite sheet: {img.size[0]}x{img.size[1]} ({img.mode})")
    
    cropped = {}
    for name, (x1, y1, x2, y2) in PIECES.items():
        # Add 2px padding around each piece for clean edges
        pad = 2
        px1 = max(0, x1 - pad)
        py1 = max(0, y1 - pad)
        px2 = min(img.size[0], x2 + pad)
        py2 = min(img.size[1], y2 + pad)
        
        piece = img.crop((px1, py1, px2, py2))
        out_path = os.path.join(OUT_DIR, f"{name}.png")
        piece.save(out_path, "PNG")
        cropped[name] = {"path": out_path, "size": piece.size}
        print(f"  {name}: ({x1},{y1})-({x2},{y2}) -> {piece.size[0]}x{piece.size[1]}")
    
    # Save mapping JSON for reference
    mapping = {}
    for name, info in cropped.items():
        mapping[name] = info["size"]
    
    with open(os.path.join(OUT_DIR, "mapping.json"), "w") as f:
        json.dump(mapping, f, indent=2)
    
    print(f"\nCropped {len(cropped)} pieces to {OUT_DIR}/")

if __name__ == "__main__":
    main()
