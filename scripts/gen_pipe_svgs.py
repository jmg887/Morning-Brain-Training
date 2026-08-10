#!/usr/bin/env python3
"""
Generate individual 144x144 SVG pipe tiles from the Gemini sprite sheet design.
Each pipe uses overlapping rectangles for wall + interior layers.
"""
import os

OUT_DIR = "/home/z/my-project/public/pipes-svg"
os.makedirs(OUT_DIR, exist_ok=True)

S = 144  # viewbox size
H = S // 2  # 72

# Channel proportions (matching sprite sheet: 40% width, ~6.5% wall)
CH_W = S * 0.40          # 57.6  channel full width
CH_HALF = CH_W / 2       # 28.8
WALL_INSET = S * 0.065   # 9.36  inset for interior from wall edge

# Precompute coordinates
ws = H - CH_HALF          # wall start  43.2
we = H + CH_HALF          # wall end  100.8


def arm_wall(dir: str) -> str:
    """Wall rectangle for one arm direction."""
    if dir == "up":
        return f"M{ws},0h{CH_W}v{we}h-{CH_W}z"
    elif dir == "down":
        return f"M{ws},{ws}h{CH_W}v{we}h-{CH_W}z"
    elif dir == "left":
        return f"M0,{ws}h{we}v{CH_W}h-{we}z"
    elif dir == "right":
        return f"M{ws},{ws}h{we}v{CH_W}h-{we}z"


def arm_interior(dir: str) -> str:
    """Interior rectangle for one arm direction."""
    ists = ws + WALL_INSET   # 52.56
    iend = we - WALL_INSET   # 91.44
    iw = iend - ists         # 38.88
    if dir == "up":
        return f"M{ists},0h{iw}v{iend}h-{iw}z"
    elif dir == "down":
        return f"M{ists},{ists}h{iw}v{iend}h-{iw}z"
    elif dir == "left":
        return f"M0,{ists}h{iend}v{iw}h-{iend}z"
    elif dir == "right":
        return f"M{ists},{ists}h{iend}v{iw}h-{iend}z"


def make_svg(wall_arms: list[str], interior_color: str) -> str:
    """Generate a clean SVG with just wall + interior paths (no bg, no markers).
       The component handles background color and source/drain markers dynamically."""
    wall_d = " ".join(arm_wall(d) for d in wall_arms)
    int_d = " ".join(arm_interior(d) for d in wall_arms)

    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
    svg += f'<path d="{wall_d}" fill="#777"/>'
    svg += f'<path d="{int_d}" fill="{interior_color}"/>'
    svg += '</svg>'
    return svg


# ─── Pipe definitions: (filename, wall_arms) ───────────────────────────────
pipes = [
    # Straights
    ("straight-h", ["left", "right"]),
    ("straight-v", ["up", "down"]),
    # Bends
    ("bend-TR", ["up", "right"]),
    ("bend-RB", ["right", "down"]),
    ("bend-BL", ["down", "left"]),
    ("bend-LT", ["left", "up"]),
    # Tees
    ("T-down", ["left", "right", "down"]),
    ("T-left", ["up", "down", "left"]),
    ("T-up", ["left", "right", "up"]),
    ("T-right", ["up", "down", "right"]),
    # Cross
    ("cross-empty", ["up", "down", "left", "right"]),
    # Stubs (dead ends)
    ("stub-right", ["right"]),
    ("stub-down", ["down"]),
    ("stub-left", ["left"]),
    ("stub-up", ["up"]),
]

# ─── Generate empty + filled for standard pipes ────────────────────────────
count = 0
for name, arms in pipes:
    # Empty variant
    svg = make_svg(arms, "#D0D0D0")
    path = os.path.join(OUT_DIR, f"{name}.svg")
    with open(path, "w") as f:
        f.write(svg)
    count += 1

    # Filled variant
    suffix = "-filled"
    if name == "cross-empty":
        fname = "cross-filled"
    else:
        fname = f"{name}{suffix}"
    svg = make_svg(arms, "#1CB0F6")
    path = os.path.join(OUT_DIR, fname)
    with open(path, "w") as f:
        f.write(svg)
    count += 1

# ─── Source tiles (pipe only, always filled blue — marker handled by component) ──
source_defs = [
    ("source-left", ["left"]),
    ("source-right", ["right"]),
    ("source-up", ["up"]),
    ("source-down", ["down"]),
]
for name, arms in source_defs:
    svg = make_svg(arms, "#1CB0F6")
    path = os.path.join(OUT_DIR, f"{name}.svg")
    with open(path, "w") as f:
        f.write(svg)
    count += 1

# ─── Drain tiles (pipe only, empty — marker handled by component) ─────────
drain_defs = [
    ("drain-right", ["right"]),
    ("drain-left", ["left"]),
    ("drain-up", ["up"]),
    ("drain-down", ["down"]),
]
for name, arms in drain_defs:
    svg = make_svg(arms, "#D0D0D0")
    path = os.path.join(OUT_DIR, f"{name}.svg")
    with open(path, "w") as f:
        f.write(svg)
    count += 1

print(f"Generated {count} SVG files in {OUT_DIR}")

# List all files
for f in sorted(os.listdir(OUT_DIR)):
    print(f"  {f}")
