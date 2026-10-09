import numpy as np, cv2, json
d = np.load('disp.npy'); H, W = d.shape
B = 5.0; tx = np.tan(np.radians(34)); ty = tx*H/W
u, v = np.meshgrid(np.arange(W), np.arange(H))
z0 = 1/(d+B)
P = np.stack([((u+.5)/W*2-1)*tx*z0, (1-(v+.5)/H*2)*ty*z0, -z0], -1)
fm = np.zeros_like(d, bool); fm[870:935, 480:1300] = True; fm[700:930, 385:470] = True; fm[700:900, 1310:1365] = True; fm[640:672, 560:920] = True
Q = P[fm]; c = Q.mean(0); _, S, Vt = np.linalg.svd(Q-c, full_matrices=False); n = Vt[2]; n = n if n[1] > 0 else -n
s = 1.6/abs(np.dot(c, n)); P *= s; z = z0*s
h = P @ n + 1.6
m = (h > 0.1) & (z < 7.9)
m[665:880, 470:1315] = False            # socle
m[:330, :] = False                       # rien de proche en hauteur
m = m.astype(np.uint8)*255
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
# garder les grandes composantes (les motos)
nb, lab, st, _ = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
for i in range(1, nb):
    if st[i, cv2.CC_STAT_AREA] > 4000: keep[lab == i] = 255
keep = cv2.dilate(keep, np.ones((5, 5), np.uint8)); cv2.imwrite('fgmask.png', keep)
vis = cv2.imread('clean.png'); vis[keep > 0] = (vis[keep > 0]*0.4 + np.array([0, 0, 255])*0.6).astype(np.uint8)
cv2.imwrite('fgmask_vis.jpg', cv2.resize(vis, (838, 470)))
print('px', (keep > 0).sum(), 'z range bikes', z[keep > 0].min(), z[keep > 0].max())
