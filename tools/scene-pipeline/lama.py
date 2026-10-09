import torch, numpy as np, cv2
from spandrel import ModelLoader
m = ModelLoader().load_from_file('big-lama.pt').eval()
img = cv2.cvtColor(cv2.imread('clean.png'), cv2.COLOR_BGR2RGB).astype(np.float32)/255
mask = (cv2.imread('fgmask.png', 0) > 0).astype(np.uint8)
mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))           # marge : pas de liseré de moto dans le fond
H, W = mask.shape; ph, pw = (8 - H % 8) % 8, (8 - W % 8) % 8
I = np.pad(img, ((0, ph), (0, pw), (0, 0)), mode='reflect'); M = np.pad(mask, ((0, ph), (0, pw)))
with torch.no_grad():
    out = m(torch.from_numpy(I).permute(2, 0, 1)[None], torch.from_numpy(M.astype(np.float32))[None, None])[0]
out = out.permute(1, 2, 0).clamp(0, 1).numpy()[:H, :W]
cv2.imwrite('bg.png', cv2.cvtColor((out*255+.5).astype(np.uint8), cv2.COLOR_RGB2BGR))
# profondeur du fond : on prolonge le décor derrière les motos
d = np.load('disp.npy').astype(np.float32)
lo, hi = d.min(), d.max()
q = ((d - lo) / (hi - lo) * 65535).astype(np.uint16)
try:
    fill = cv2.inpaint(q, mask*255, 25, cv2.INPAINT_TELEA)
except cv2.error:
    q8 = ((d - lo) / (hi - lo) * 255).astype(np.uint8); fill = cv2.inpaint(q8, mask*255, 25, cv2.INPAINT_TELEA).astype(np.float32) * 257
dbg = lo + fill.astype(np.float32) / 65535 * (hi - lo)
np.save('disp_bg.npy', dbg)
cv2.imwrite('bg_vis.jpg', cv2.resize(cv2.imread('bg.png'), (838, 470)))
cv2.imwrite('dbg_vis.jpg', cv2.resize(((dbg - lo)/(hi-lo)*255).astype(np.uint8), (838, 470)))
print('ok')
