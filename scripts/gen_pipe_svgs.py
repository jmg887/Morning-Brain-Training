#!/usr/bin/env python3
"""Generate 144x144 SVG pipe tiles with smooth rounded bend corners.

Fixes over previous version:
1. All coordinates are clean integers (no floating-point noise)
2. Bend corner radius increased from ~22 to 36 for smooth curves
3. Source/drain are full-width straight pipes (not half-length stubs)
4. T-junctions use single merged paths (no overlapping rectangles)
"""
import os

OUT_DIR = "/home/z/my-project/public/pipes-svg"
os.makedirs(OUT_DIR, exist_ok=True)

# Integer dimensions — no floating-point noise
S = 144
H = S // 2          # 72
CH_HALF = 29        # channel half-width (channel = 58px wide)
WALL_T = 9           # wall thickness
R = 36               # bend corner radius (was 21.6, now much smoother)


def _c(inset=0):
    """Return (start, end, width) for the channel along one axis."""
    a = H - CH_HALF + inset
    b = H + CH_HALF - inset
    return a, b, b - a


def straight_h(inset=0):
    a, b, w = _c(inset)
    return f"M0,{a}h{S}v{w}h-{S}z"


def straight_v(inset=0):
    a, b, w = _c(inset)
    return f"M{a},0v{S}h{w}v-{S}z"


def cross(inset=0):
    a, b, w = _c(inset)
    return f"M{a},0v{S}h{w}v-{S}z M0,{a}h{S}v{w}h-{S}z"


def tee_down(inset=0):
    """Horizontal bar + down stem (single merged path, no overlap)."""
    a, b, w = _c(inset)
    return f"M0,{a}H{S}V{b}H{b}V{S}H{a}V{b}H0Z"


def tee_up(inset=0):
    """Horizontal bar + up stem (single merged path, no overlap)."""
    a, b, w = _c(inset)
    return f"M0,{a}H{a}V0H{b}V{a}H{S}V{b}H0Z"


def tee_left(inset=0):
    """Vertical bar + left stem (single merged path, no overlap)."""
    a, b, w = _c(inset)
    return f"M{a},0H{b}V{S}H{a}V{b}H0V{a}H{a}Z"


def tee_right(inset=0):
    """Vertical bar + right stem (single merged path, no overlap)."""
    a, b, w = _c(inset)
    return f"M{a},0H{b}V{a}H{S}V{b}H{b}V{S}H{a}Z"


TEE_FNS = {'down': tee_down, 'left': tee_left, 'up': tee_up, 'right': tee_right}


def stub(d, inset=0):
    a, b, w = _c(inset)
    if d == 'right': return f"M{a},{a}H{S}V{b}H{a}Z"
    if d == 'left':  return f"M0,{a}H{b}V{b}H0Z"
    if d == 'down':  return f"M{a},{a}V{S}H{b}V{a}Z"
    if d == 'up':    return f"M{a},0V{b}H{b}V0Z"


def bend_tr(inset=0):
    """TR bend: connects TOP and RIGHT. Smooth rounded corners.
    
    L-shape CW: (a,0)->(b,0)->turn->(S,a)->(S,b)->turn->(a,b)->(a,0)
    Convex corner at (b,a): arc CW from (b, a-r) to (b-r, a)
    Reflex corner at (a,b): arc CCW from (a+r, b) to (a, b-r)
    """
    a, b, w = _c(inset)
    r = max(R - inset, 2)
    return (f"M{a},0H{b}V{a - r}A{r},{r} 0 0,1 {b - r},{a}"
            f"H{S}V{b}H{a + r}A{r},{r} 0 0,0 {a},{b - r}V0Z")


def _svg(wall_d, int_d, color):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
            f'<path d="{wall_d}" fill="#777"/>'
            f'<path d="{int_d}" fill="{color}"/>'
            f'</svg>')


def _write(fname, wall_d, int_d):
    with open(os.path.join(OUT_DIR, f'{fname}.svg'), 'w') as f:
        f.write(_svg(wall_d, int_d, '#D0D0D0'))
    with open(os.path.join(OUT_DIR, f'{fname}-filled.svg'), 'w') as f:
        f.write(_svg(wall_d, int_d, '#1CB0F6'))


count = 0

# Straights
_write('straight-h', straight_h(0), straight_h(WALL_T))
_write('straight-v', straight_v(0), straight_v(WALL_T))
count += 4

# Bends: TR directly, others via rotation
_write('bend-TR', bend_tr(0), bend_tr(WALL_T))
count += 2
for name, angle in [('bend-RB', 90), ('bend-BL', 180), ('bend-LT', 270)]:
    wd = bend_tr(0)
    id_ = bend_tr(WALL_T)
    for color, suf in [('#D0D0D0', ''), ('#1CB0F6', '-filled')]:
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
               f'<g transform="rotate({angle},{H},{H})">'
               f'<path d="{wd}" fill="#777"/>'
               f'<path d="{id_}" fill="{color}"/>'
               f'</g></svg>')
        with open(os.path.join(OUT_DIR, f'{name}{suf}.svg'), 'w') as f:
            f.write(svg)
        count += 1

# Cross (manual naming: cross-empty.svg / cross-filled.svg)
with open(os.path.join(OUT_DIR, 'cross-empty.svg'), 'w') as f:
    f.write(_svg(cross(0), cross(WALL_T), '#D0D0D0'))
with open(os.path.join(OUT_DIR, 'cross-filled.svg'), 'w') as f:
    f.write(_svg(cross(0), cross(WALL_T), '#1CB0F6'))
count += 2

# Tees
for o in ['down', 'left', 'up', 'right']:
    fn = TEE_FNS[o]
    _write(f'T-{o}', fn(0), fn(WALL_T))
    count += 2

# Stubs
for d in ['right', 'down', 'left', 'up']:
    _write(f'stub-{d}', stub(d, 0), stub(d, WALL_T))
    count += 2

# Source (filled blue) — source-left is full-width straight; others are stubs
with open(os.path.join(OUT_DIR, 'source-left.svg'), 'w') as f:
    f.write(_svg(straight_h(0), straight_h(WALL_T), '#1CB0F6'))
count += 1
for d in ['right', 'up', 'down']:
    with open(os.path.join(OUT_DIR, f'source-{d}.svg'), 'w') as f:
        f.write(_svg(stub(d, 0), stub(d, WALL_T), '#1CB0F6'))
    count += 1

# Drain (empty gray) — drain-right is full-width straight; others are stubs
with open(os.path.join(OUT_DIR, 'drain-right.svg'), 'w') as f:
    f.write(_svg(straight_h(0), straight_h(WALL_T), '#D0D0D0'))
count += 1
for d in ['left', 'up', 'down']:
    with open(os.path.join(OUT_DIR, f'drain-{d}.svg'), 'w') as f:
        f.write(_svg(stub(d, 0), stub(d, WALL_T), '#D0D0D0'))
    count += 1

print(f"Generated {count} SVG files in {OUT_DIR}")
for f in sorted(os.listdir(OUT_DIR)):
    print(f"  {f}")
