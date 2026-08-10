#!/usr/bin/env python3
"""Remove solid backgrounds from pipe PNG assets, making them transparent."""

from PIL import Image
import numpy as np
import os

PIPE_DIR = "/home/z/my-project/public/pipes"

def remove_background(img: Image.Image, threshold: int = 30) -> Image.Image:
    """Remove near-white/grey background from a pipe image.
    
    Strategy: flood fill from all corner seeds to mark background,
    then make those pixels transparent.
    """
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    
    # Background color sample from corners (top-left)
    bg_samples = []
    for y, x in [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1)]:
        bg_samples.append(arr[y, x, :3].astype(float))
    
    # Average background color
    bg_color = np.mean(bg_samples, axis=0)
    
    # Create mask: pixels close to background color are background
    rgb = arr[:, :, :3].astype(float)
    dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))
    
    # Flood fill from corners to handle gradient edges
    mask = np.zeros((h, w), dtype=bool)
    
    from collections import deque
    queue = deque()
    seeds = [(0, 0), (0, w-1), (h-1, 0), (h-1, w-1),
             (0, w//2), (h-1, w//2), (h//2, 0), (h//2, w-1)]
    
    for sy, sx in seeds:
        if sy < h and sx < w and dist[sy, sx] < threshold:
            mask[sy, sx] = True
            queue.append((sy, sx))
    
    while queue:
        y, x = queue.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and dist[ny, nx] < threshold:
                mask[ny, nx] = True
                queue.append((ny, nx))
    
    # Make background pixels transparent
    arr[mask, 3] = 0
    
    # Also soften edges: pixels near the boundary get reduced alpha
    from scipy import ndimage
    dilated = ndimage.binary_dilation(mask, iterations=2)
    edge = dilated & ~mask
    # Reduce alpha at edges for smoother blending
    arr[edge, 3] = np.clip(arr[edge, 3].astype(int) - 100, 0, 255).astype(np.uint8)
    
    return Image.fromarray(arr, 'RGBA')

def remove_background_simple(img: Image.Image, threshold: float = 35.0) -> Image.Image:
    """Simpler approach: just threshold based on color distance from background."""
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    
    # Sample background from multiple edge pixels
    bg_pixels = []
    for y in range(min(5, h)):
        for x in range(w):
            bg_pixels.append(arr[y, x, :3].astype(float))
    for y in range(max(0, h-5), h):
        for x in range(w):
            bg_pixels.append(arr[y, x, :3].astype(float))
    for x in range(min(5, w)):
        for y in range(h):
            bg_pixels.append(arr[y, x, :3].astype(float))
    for x in range(max(0, w-5), w):
        for y in range(h):
            bg_pixels.append(arr[y, x, :3].astype(float))
    
    bg_pixels = np.array(bg_pixels)
    # Use median for robustness
    bg_color = np.median(bg_pixels, axis=0)
    
    # Compute distance
    rgb = arr[:, :, :3].astype(float)
    dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))
    
    # Background mask with soft edge
    alpha = arr[:, :, 3].astype(float)
    
    # Hard threshold: fully transparent
    bg_mask = dist < threshold
    # Soft edge: partially transparent
    edge_mask = (dist >= threshold) & (dist < threshold + 20)
    
    alpha[bg_mask] = 0
    if np.any(edge_mask):
        t = (dist[edge_mask] - threshold) / 20.0
        alpha[edge_mask] = np.minimum(alpha[edge_mask], t * 255)
    
    arr[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def main():
    files = sorted(f for f in os.listdir(PIPE_DIR) if f.endswith('.png'))
    
    for fname in files:
        path = os.path.join(PIPE_DIR, fname)
        img = Image.open(path)
        
        try:
            result = remove_background_simple(img, threshold=30)
            result.save(path, 'PNG')
            print(f"  {fname}: bg removed")
        except Exception as e:
            print(f"  {fname}: ERROR - {e}")
    
    print(f"\nProcessed {len(files)} files")

if __name__ == "__main__":
    main()
