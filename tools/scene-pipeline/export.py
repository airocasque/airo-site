import numpy as np, json
from PIL import Image
d = np.load('disp.npy'); H, W = d.shape
B = 5.0; HFOV = np.radians(68); tx = np.tan(HFOV/2); ty = tx*H/W
def P(mask_or_uv, s=1.0):
    v, u = np.nonzero(mask_or_uv); z = s/(d[v, u]+B)
    return np.stack([((u+.5)/W*2-1)*tx*z, (1-(v+.5)/H*2)*ty*z, -z], 1)
def fit(Q):
    c = Q.mean(0); _, S, Vt = np.linalg.svd(Q-c, full_matrices=False); n = Vt[2]
    return c, (n if n[1] > 0 else -n)
fm = np.zeros_like(d, bool); fm[870:935, 480:1300] = True; fm[700:930, 385:470] = True; fm[700:900, 1310:1365] = True; fm[640:672, 560:920] = True
c, n = fit(P(fm)); s = 1.6/abs(np.dot(c, n))
c, n = fit(P(fm, s))
pm = np.zeros_like(d, bool); pm[730:800, 700:1080] = True
pc, pn = fit(P(pm, s))
# repère monde : sol y=0, podium centré en x=z=0, caméra d'origine sur +z
up = n
fwd = np.array([pc[0], 0, pc[2]]); fwd = fwd - up*np.dot(fwd, up); fwd /= np.linalg.norm(fwd)   # direction caméra→podium, horizontale
right = np.cross(fwd, up); right /= np.linalg.norm(right)
R = np.stack([right, up, -fwd])                          # lignes : axes monde exprimés en repère caméra
podiumTop = float(np.dot(pc, up) + 1.6)
origin_ground = pc - up*np.dot(pc, up) - up*1.6          # projeté du podium au sol (repère caméra)
def toWorld(p): return R @ (np.asarray(p) - origin_ground)
cam = toWorld([0, 0, 0])
M = np.eye(4); M[:3, :3] = R; M[:3, 3] = -R @ origin_ground
# profondeur métrique (z) en 16 bits, demi-résolution
z = s/(d+B)
zs = np.asarray(Image.fromarray(z.astype(np.float32), mode='F').resize((960, 540), Image.BILINEAR))
q = np.clip(np.round(zs*1000), 0, 65535).astype(np.uint16)
rgb = np.zeros((540, 960, 3), np.uint8); rgb[..., 0] = q >> 8; rgb[..., 1] = q & 255
Image.fromarray(rgb).save('depth16.png', optimize=True)
def at(u, v):
    zz = s/(d[v, u]+B); return toWorld([((u+.5)/W*2-1)*tx*zz, (1-(v+.5)/H*2)*ty*zz, -zz]).round(3).tolist()
targets = {k: at(*uv) for k, uv in {'tvL': (520, 375), 'airo': (575, 200), 'helmets': (170, 330), 'helmetsMid': (930, 260), 'jackets': (900, 400), 'counter': (1080, 520), 'tvR': (1510, 420), 'bikeL': (230, 600), 'bikeR': (1520, 600)}.items()}
out = {'hfov': 68, 'aspect': W/H, 'matrix': M.T.flatten().round(6).tolist(), 'camera': cam.round(3).tolist(), 'podiumTop': round(podiumTop, 3), 'targets': targets}
json.dump(out, open('scene.json', 'w'), indent=1); print(json.dumps(out)[:900])

# calque arrière (motos effacées) : même calibration, profondeur reconstituée
dbg = np.load('disp_bg.npy'); zb = s/(dbg+B)
zbs = np.asarray(Image.fromarray(zb.astype(np.float32), mode='F').resize((960, 540), Image.BILINEAR))
qb = np.clip(np.round(zbs*1000), 0, 65535).astype(np.uint16)
rgb = np.zeros((540, 960, 3), np.uint8); rgb[..., 0] = qb >> 8; rgb[..., 1] = qb & 255
Image.fromarray(rgb).save('depth-bg16.png', optimize=True)

# calque avant (motos) : hors du masque, on recopie la profondeur de la moto la plus proche,
# pour que les triangles du contour restent à la profondeur de la moto (aucun étirement)
import cv2
mk = (cv2.imread('fgmask.png', 0) > 0)
_, lab = cv2.distanceTransformWithLabels((~mk).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
ys, xs = np.nonzero(mk); idx = np.zeros(lab.max()+1, np.int64)
lp = lab[ys, xs]; idx[lp] = np.arange(len(ys))
zf = z[ys[idx[lab]], xs[idx[lab]]]
zfs = np.asarray(Image.fromarray(zf.astype(np.float32), mode='F').resize((960, 540), Image.NEAREST))
qf = np.clip(np.round(zfs*1000), 0, 65535).astype(np.uint16)
rgb = np.zeros((540, 960, 3), np.uint8); rgb[..., 0] = qf >> 8; rgb[..., 1] = qf & 255
Image.fromarray(rgb).save('depth-fg16.png', optimize=True)
print('fg depth ok')
