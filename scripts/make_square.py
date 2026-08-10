#!/usr/bin/env python3
"""Make all pipe PNGs square by centering and padding to max dimension."""

from PIL import Image
import os

PIPE_DIR = "/home/z/my-project/public/pipes"
TARGET_SIZE = 144  # square size

def make_square(img: Image.Image, size: int) -> Image.Image:
    w, h = img.size
    new = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    # Center the image
    x = (size - w) // 2
    y = (size - h) // 2
    new.paste(img, (x, y))
    return new

def main():
    files = sorted(f for f in os.listdir(PIPE_DIR) if f.endswith('.png'))
    for fname in files:
        path = os.path.join(PIPE_DIR, fname)
        img = Image.open(path)
        if img.size[0] != img.size[1]:
            result = make_square(img, TARGET_SIZE)
            result.save(path, 'PNG')
            print(f"  {fname}: {img.size} -> {result.size}")
    print(f"Done")

if __name__ == "__main__":
    main()
