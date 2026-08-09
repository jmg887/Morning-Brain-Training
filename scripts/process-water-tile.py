import numpy as np
from PIL import Image, ImageFilter

# Load raw generated image
img = Image.open('/home/z/my-project/water-tile-raw.png').convert('RGBA')
print(f'Original size: {img.size}')

# Step 1: Make tileable using edge blending
# Blend edges so left matches right, top matches bottom
arr = np.array(img, dtype=np.float32)
h, w = arr.shape[:2]

blend_w = w // 4  # blend zone width
blend_h = h // 4

# Create horizontal blend mask (blends left/right edges)
h_mask = np.ones((h, w), dtype=np.float32)
for x in range(blend_w):
    t = x / blend_w
    h_mask[:, x] = t
    h_mask[:, w - 1 - x] = t

# Create vertical blend mask (blends top/bottom edges)
v_mask = np.ones((h, w), dtype=np.float32)
for y in range(blend_h):
    t = y / blend_h
    v_mask[y, :] = t
    v_mask[h - 1 - y, :] = t

# Combined mask
mask = h_mask * v_mask
mask_3ch = np.stack([mask] * 4, axis=-1)

# Shifted version (wrapped)
shifted = np.roll(np.roll(arr, w // 2, axis=1), h // 2, axis=0)

# Blend
blended = arr * mask_3ch + shifted * (1 - mask_3ch)
blended = np.clip(blended, 0, 255).astype(np.uint8)
blended_img = Image.fromarray(blended, 'RGBA')

# Step 2: Add slight transparency (alpha ~200 so gray pipe shows through)
alpha = blended_img.split()[3]
alpha = alpha.point(lambda p: min(255, int(p * 0.75)))  # make semi-transparent
blended_img.putalpha(alpha)

# Step 3: Downscale to 64x64 with high-quality resampling
tile = blended_img.resize((64, 64), Image.LANCZOS)

# Step 4: Sharpen slightly to keep it crisp at small size
tile = tile.filter(ImageFilter.UnsharpMask(radius=1, percent=50))

tile.save('/home/z/my-project/public/water-tile.png')
print(f'Saved: /home/z/my-project/public/water-tile.png ({tile.size})')

# Also save a 128x128 version for preview
tile_preview = blended_img.resize((128, 128), Image.LANCZOS)
tile_preview.save('/home/z/my-project/water-tile-preview.png')
print(f'Saved: /home/z/my-project/water-tile-preview.png ({tile_preview.size})')
