from PIL import Image

tile = Image.open('/home/z/my-project/public/water-tile.png').convert('RGBA')
print(f'Tile size: {tile.size}, mode: {tile.mode}')

# Create 4x4 tiled preview
canvas = Image.new('RGBA', (64*4, 64*4), (200, 200, 200, 255))  # gray bg
for row in range(4):
    for col in range(4):
        canvas.paste(tile, (col * 64, row * 64), tile)

canvas.save('/home/z/my-project/water-tile-check.png')
print('Tiled preview saved: /home/z/my-project/water-tile-check.png')

# Also create a 2x2 at 128px for closer inspection
canvas2 = Image.new('RGBA', (128*2, 128*2), (200, 200, 200, 255))
tile128 = Image.open('/home/z/my-project/water-tile-preview.png').convert('RGBA')
for row in range(2):
    for col in range(2):
        canvas2.paste(tile128, (col * 128, row * 128), tile128)

canvas2.save('/home/z/my-project/water-tile-check-large.png')
print('Large tiled preview saved: /home/z/my-project/water-tile-check-large.png')
