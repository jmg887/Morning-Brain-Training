#!/usr/bin/env python3
"""Generate 144x144 SVG pipe tiles with smooth rounded bend corners."""
import os

OUT_DIR = "/home/z/my-project/public/pipes-svg"
os.makedirs(OUT_DIR, exist_ok=True)

S = 144.0
H = S / 2  # 72
CH_W = S * 0.40
CH_HALF = CH_W / 2
WALL_T = S * 0.065
ws = H - CH_HALF  # 43.2
we = H + CH_HALF  # 100.8
R = CH_HALF * 0.75  # corner radius ~21.6


def _c(inset=0):
    a = ws + inset
    b = we - inset
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


def arm_rect(d, inset=0):
    a, b, w = _c(inset)
    if d == 'left':   return f"M0,{a}h{b}v{w}h-{b}z"
    if d == 'right':  return f"M{a},{a}h{S - a}v{w}h-{S - a}z"
    if d == 'up':    return f"M{a},0v{b}h{w}v-{b}z"
    if d == 'down':  return f"M{a},{a}v{S - a}h{w}v-{S - a}z"


def tee(orientation, inset=0):
    arms_map = {
        'down':  ['left', 'right', 'down'],
        'left':  ['up', 'down', 'left'],
        'up':    ['left', 'right', 'up'],
        'right': ['up', 'down', 'right'],
    }
    return ' '.join(arm_rect(d, inset) for d in arms_map[orientation])


def stub(d, inset=0):
    return arm_rect(d, inset)


def bend_tr(inset=0):
    """
    TR bend: connects UP and RIGHT.
    L-shape with 6 vertices, CW from top-left:
    (a,0)→(b,0)→(b,a)→(S,a)→(S,b)→(a,b)→(a,0)
    
    Convex corner at (b,a): going DOWN then RIGHT. Round by cutting tip.
    Reflex corner at (a,b): going LEFT then UP. Round by filling.
    """
    a, b, w = _c(inset)
    r = max(R - inset * 1.2, 2)
    # Round convex corner (b,a): stop at (b, a-r), arc CW to (b-r, a)
    # Round reflex corner (a,b): stop at (a+r, b), arc CCW to (a, b-r)
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

# Cross
with open(os.path.join(OUT_DIR, 'cross-empty.svg'), 'w') as f:
    f.write(_svg(cross(0), cross(WALL_T), '#D0D0D0'))
with open(os.path.join(OUT_DIR, 'cross-filled.svg'), 'w') as f:
    f.write(_svg(cross(0), cross(WALL_T), '#1CB0F6'))
count += 2

# Tees
for o in ['down', 'left', 'up', 'right']:
    _write(f'T-{o}', tee(o, 0), tee(o, WALL_T))
    count += 2

# Stubs
for d in ['right', 'down', 'left', 'up']:
    _write(f'stub-{d}', stub(d, 0), stub(d, WALL_T))
    count += 2

# Source (filled)
for d in ['left', 'right', 'up', 'down']:
    with open(os.path.join(OUT_DIR, f'source-{d}.svg'), 'w') as f:
        f.write(_svg(stub(d, 0), stub(d, WALL_T), '#1CB0F6'))
    count += 1

# Drain (empty)
for d in ['right', 'left', 'up', 'down']:
    with open(os.path.join(OUT_DIR, f'drain-{d}.svg'), 'w') as f:
        f.write(_svg(stub(d, 0), stub(d, WALL_T), '#D0D0D0'))
    count += 1

print(f"Generated {count} SVG files in {OUT_DIR}")
for f in sorted(os.listdir(OUT_DIR)):
    print(f"  {f}")
