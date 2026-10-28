"""
Draws the sample agent logos of this folder. Needs Pillow and numpy (pip install pillow numpy).
Run from anywhere:  python make-logos.py
Every picture is drawn at 4x and reduced, so the edges are smooth. No real brand or tenant data:
the logos are original shapes made for testing Agent Manifest Studio.
"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent
WHITE = (255, 255, 255)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Art:
    """A drawing in a 100 x 100 space, kept as two masks: `main` and `accent` (accent is drawn over main)."""

    def __init__(self, w, h, g=1.0, ss=4):
        self.w, self.h, self.g, self.ss = w, h, g, ss
        self.m = {n: Image.new('L', (w * ss, h * ss), 0) for n in ('main', 'accent')}
        self.k = min(w, h) / 100 * ss
        self.cx, self.cy = w * ss / 2, h * ss / 2

    def P(self, p):
        return (self.cx + (p[0] - 50) * self.g * self.k, self.cy + (p[1] - 50) * self.g * self.k)

    def R(self, r):
        return r * self.g * self.k

    def _do(self, t, fn):
        plan = {'main': [('main', 255)], 'accent': [('accent', 255)], 'cut': [('main', 0), ('accent', 0)],
                'cutmain': [('main', 0)], 'cutaccent': [('accent', 0)]}[t]
        for name, v in plan:
            fn(ImageDraw.Draw(self.m[name]), v)

    def circle(self, c, r, t):
        x, y = self.P(c); rr = self.R(r)
        self._do(t, lambda d, v: d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=v))

    def rr(self, box, r, t):
        a, b = self.P(box[:2]), self.P(box[2:])
        self._do(t, lambda d, v: d.rounded_rectangle([*a, *b], radius=self.R(r), fill=v))

    def poly(self, pts, t):
        q = [self.P(p) for p in pts]
        self._do(t, lambda d, v: d.polygon(q, fill=v))

    def path(self, pts, width, t):
        q = [self.P(p) for p in pts]
        w = max(1, int(round(self.R(width))))
        self._do(t, lambda d, v: [d.line([q[i], q[i + 1]], fill=v, width=w) for i in range(len(q) - 1)])
        for p in pts:
            self.circle(p, width / 2, t)

    def star(self, c, a, t, p=2.6):
        pts = []
        for i in range(160):
            th = 2 * math.pi * i / 160
            co, si = math.cos(th), math.sin(th)
            pts.append((c[0] + a * math.copysign(abs(co) ** p, co), c[1] + a * math.copysign(abs(si) ** p, si)))
        self.poly(pts, t)


def bezier(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        u = i / n
        out.append(tuple((1 - u) ** 3 * p0[j] + 3 * (1 - u) ** 2 * u * p1[j] + 3 * (1 - u) * u ** 2 * p2[j] + u ** 3 * p3[j] for j in (0, 1)))
    return out


def hexv(c, r):
    return [(c[0] + r * math.cos(math.radians(-90 + 60 * i)), c[1] + r * math.sin(math.radians(-90 + 60 * i))) for i in range(6)]


# ---- the seven glyphs -------------------------------------------------------------------------

def robot(a):
    a.rr((22, 30, 78, 80), 14, 'main')
    a.path([(50, 31), (50, 20)], 4, 'main')
    a.circle((50, 16), 6, 'accent')
    a.rr((13, 46, 22, 64), 4, 'main'); a.rr((78, 46, 87, 64), 4, 'main')
    a.circle((39, 53), 7.5, 'cut'); a.circle((61, 53), 7.5, 'cut')
    a.circle((39, 53), 3.4, 'accent'); a.circle((61, 53), 3.4, 'accent')
    a.rr((38, 67, 62, 72), 2.5, 'cut')


def spark(a):
    a.star((44, 56), 36, 'main')
    a.star((77, 24), 20, 'cutmain')
    a.star((77, 24), 14, 'accent')
    a.star((80, 78), 8, 'accent')


def bubble(a):
    a.rr((14, 20, 86, 70), 17, 'main')
    a.poly([(28, 62), (23, 87), (52, 67)], 'main')
    for x in (35, 50, 65):
        a.circle((x, 45), 5.5, 'cut')
    a.circle((82, 24), 16, 'cutmain')
    a.circle((82, 24), 11.5, 'accent')


def headset(a):
    a.circle((50, 50), 19, 'main')
    a.circle((50, 108), 36, 'main')
    a.poly([(0, 88), (100, 88), (100, 140), (0, 140)], 'cut')
    a.path([(50 + 30 * math.cos(math.radians(t)), 50 + 30 * math.sin(math.radians(t))) for t in range(180, 361, 6)], 5, 'accent')
    a.rr((15, 40, 26, 60), 4.5, 'accent'); a.rr((74, 40, 85, 60), 4.5, 'accent')
    a.path([(80, 60), (79, 70), (71, 75), (62, 75)], 3, 'accent')
    a.circle((60, 75), 4.6, 'accent')
    a.circle((43, 50), 2.7, 'cut'); a.circle((57, 50), 2.7, 'cut')


def hexnet(a):
    a.poly(hexv((50, 50), 41), 'main')
    a.poly(hexv((50, 50), 32), 'cut')
    inner = hexv((50, 50), 32)
    for i in (0, 2, 4):
        a.path([(50, 50), inner[i]], 3.4, 'main')
    a.circle((50, 50), 9.5, 'accent')
    for i in (0, 2, 4):
        a.circle(inner[i], 6, 'accent')


def shield(a):
    right = bezier((84, 46), (84, 68), (66, 80), (50, 91))
    left = bezier((50, 91), (34, 80), (16, 68), (16, 46))
    pts = [(50, 10), (84, 24)] + right + left + [(16, 24)]
    a.poly(pts, 'main')
    a.poly(pts, 'accent')
    a.poly([(0, 0), (50, 0), (50, 100), (0, 100)], 'cutaccent')
    a.star((50, 49), 20, 'cut')


def orbit(a):
    ring = []
    for t in range(0, 361, 4):
        x, y = 40 * math.cos(math.radians(t)), 15 * math.sin(math.radians(t))
        r = math.radians(-28)
        ring.append((50 + x * math.cos(r) - y * math.sin(r), 50 + x * math.sin(r) + y * math.cos(r)))
    a.path(ring, 5.6, 'main')
    a.circle((50, 50), 26, 'cutmain')
    a.circle((50, 50), 20, 'main')
    a.circle((43, 43), 6, 'cut')
    front = ring[0:46]                       # the lower half of the ring passes in front of the sphere
    a.path(front, 11, 'cutmain')
    a.path(front, 5.6, 'main')
    sat = ring[int(300 / 4)]
    a.circle(sat, 11, 'cutmain')
    a.circle(sat, 7.2, 'accent')


GLYPHS = {
    'robot': (robot, '#0F6CBD', '#FFB900'),
    'spark': (spark, '#7C3AED', '#F472B6'),
    'bubble': (bubble, '#0E8A7D', '#FF7A59'),
    'headset': (headset, '#2B3A67', '#2DD4BF'),
    'hexnet': (hexnet, '#107C41', '#F5B800'),
    'shield': (shield, '#1D4ED8', '#38BDF8'),
    'orbit': (orbit, '#BE185D', '#FBBF24'),
}


# ---- composing --------------------------------------------------------------------------------

def draw(fn, w, h, g=1.0, ss=4):
    a = Art(w, h, g, ss)
    fn(a)
    return a


def alphas(a):
    size = (a.w, a.h)
    return [np.asarray(a.m[n].resize(size, Image.LANCZOS), dtype=np.float32) / 255 for n in ('main', 'accent')]


def field(colour, w, h):
    return np.broadcast_to(np.array(colour, dtype=np.float32), (h, w, 3)) if len(np.shape(colour)) == 1 else colour


def compose(a, main, acc, bg=None):
    am, aa = alphas(a)
    mc, ac = field(main, a.w, a.h), field(acc, a.w, a.h)
    ta = am + aa - am * aa
    c = aa[..., None] * ac + (1 - aa)[..., None] * am[..., None] * mc
    if bg is None:
        rgb = np.where(ta[..., None] > 1e-4, c / np.maximum(ta, 1e-4)[..., None], mc)
        return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), ta * 255]).round().astype(np.uint8), 'RGBA')
    b = field(bg, a.w, a.h)
    rgb = c + (1 - ta)[..., None] * b
    return Image.fromarray(np.clip(rgb, 0, 255).round().astype(np.uint8), 'RGB').convert('RGBA')


def trim_fit(img, side, inner):
    box = img.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    crop = img.crop(box)
    s = inner / max(crop.size)
    crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
    out = Image.new('RGBA', (side, side), (255, 255, 255, 0))
    out.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    return out


def save(img, folder, name, **kw):
    d = OUT / folder
    d.mkdir(exist_ok=True)
    img.save(d / name, **kw)


def main():
    sheet = []
    for name, (fn, brand, accent) in GLYPHS.items():
        B, A = hexc(brand), hexc(accent)
        big = draw(fn, 512, 512, 0.95)
        save(compose(big, B, A, WHITE), '01-white-background', f'{name}.png', optimize=True)
        save(compose(big, WHITE, WHITE, B), '02-brand-tile-white-logo', f'{name}.png', optimize=True)
        trans = compose(big, B, A)
        save(trans, '03-transparent-colour', f'{name}.png', optimize=True)
        white = compose(big, WHITE, WHITE)
        save(white, '04-white-on-transparent', f'{name}.png', optimize=True)
        save(trim_fit(white, 32, 26), '05-outline-32', f'{name}.png', optimize=True)
        save(compose(draw(fn, 192, 192, 0.82, 6), B, A), '06-teams-ready-192', f'{name}.png', optimize=True)
        sheet.append((name, compose(big, B, A, WHITE).resize((200, 200), Image.LANCZOS), compose(big, WHITE, WHITE, B).resize((200, 200), Image.LANCZOS)))

    # ---- edge cases, each one made to meet a rule of the tool
    E = '07-edge-cases'
    robot_fn, rb, ra = GLYPHS['robot']; RB, RA = hexc(rb), hexc(ra)
    spark_fn, sb, sa = GLYPHS['spark']
    a = draw(robot_fn, 512, 512, 0.95)
    yy, xx = np.mgrid[0:512, 0:512].astype(np.float32)
    t = ((xx + yy) / 1022)[..., None]
    grad = (1 - t) * np.array(hexc('#CFE8FF'), np.float32) + t * np.array(hexc('#FFE3F1'), np.float32)
    save(compose(a, RB, RA, grad), E, 'gradient-background-robot.png')                       # no flat colour: the tool says so
    save(compose(draw(spark_fn, 512, 512, 1.5), hexc(sb), hexc(sa)), E, 'logo-touches-the-edges-spark.png')   # safe-area warning
    save(compose(draw(headset, 600, 400, 0.95), *map(hexc, ('#2B3A67', '#2DD4BF')), WHITE), E, 'wide-600x400-headset.png', optimize=True)  # not square
    save(compose(draw(hexnet, 1600, 1600, 0.95, 2), *map(hexc, ('#107C41', '#F5B800')), WHITE), E, 'huge-1600-hexnet.png', optimize=True)  # reduced to 1024
    sp = draw(spark_fn, 512, 512, 0.95)
    rainbow = np.clip((1 - xx[..., None] / 511) * np.array(hexc('#FF4D6D'), np.float32) * (1 - yy[..., None] / 700) + (xx[..., None] / 511) * np.array(hexc('#3B82F6'), np.float32) + (yy[..., None] / 511) * np.array(hexc('#FACC15'), np.float32) * 0.6, 0, 255)
    save(compose(sp, rainbow, rainbow), E, 'many-colours-spark.png', optimize=True)         # the "keep your colours" design
    save(compose(draw(shield, 512, 512, 0.95), WHITE, WHITE, hexc('#FFF3C4')), E, 'low-contrast-white-on-light-yellow-shield.png', optimize=True)
    sh = compose(a, RB, RA)                                                                   # robot with a soft shadow on white
    al = sh.getchannel('A')
    shadow = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); shadow.putalpha(al.point(lambda v: int(v * 0.35)))
    shadow = shadow.transform((512, 512), Image.AFFINE, (1, 0, -6, 0, 1, -12)).filter(ImageFilter.GaussianBlur(9))
    base = Image.new('RGBA', (512, 512), WHITE + (255,)); base.alpha_composite(shadow); base.alpha_composite(sh)
    save(base, E, 'soft-shadow-on-white-robot.png', optimize=True)                           # halo: use tolerance, softness, matte
    save(compose(a, RB, RA, WHITE).convert('RGB'), E, 'robot-white-background.jpg', quality=92)  # not a PNG
    small = compose(draw(robot_fn, 192, 192, 0.82, 6), RB, RA)
    random.seed(7)
    noise = np.random.default_rng(7).integers(0, 255, (192, 192, 3)).astype(np.float32) * 0.8 + np.array(RB, np.float32) * 0.2
    noisy = Image.fromarray(noise.astype(np.uint8), 'RGB').convert('RGBA'); noisy.alpha_composite(small)
    save(noisy, E, 'heavy-noisy-192-robot.png')                                              # over the weight limit
    save(trim_fit(compose(draw(robot_fn, 512, 512, 0.95), RB, RA), 32, 26), E, 'coloured-outline-32-robot.png', optimize=True)  # "Make the shape white"

    # ---- overview sheet
    W = 200
    s = Image.new('RGB', (len(sheet) * (W + 16) + 16, 2 * (W + 16) + 16), (245, 245, 247))
    for i, (n, l, d) in enumerate(sheet):
        s.paste(l.convert('RGB'), (16 + i * (W + 16), 16)); s.paste(d.convert('RGB'), (16 + i * (W + 16), 32 + W))
    s.save(OUT / 'overview.png')


if __name__ == '__main__':
    main()
