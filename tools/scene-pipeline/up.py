import torch, numpy as np, sys
from PIL import Image
from spandrel import ModelLoader
torch.set_num_threads(max(1, torch.get_num_threads()))
m = ModelLoader().load_from_file('RealESRGAN_x4plus.pth').eval()
im = np.asarray(Image.open('clean.png').convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape; S = 4; T = 256; P = 16
out = np.zeros((H*S, W*S, 3), np.float32)
with torch.no_grad():
    for y in range(0, H, T):
        for x in range(0, W, T):
            ya, xa = max(0, y-P), max(0, x-P); yb, xb = min(H, y+T+P), min(W, x+T+P)
            t = torch.from_numpy(im[ya:yb, xa:xb]).permute(2, 0, 1)[None]
            r = m(t)[0].permute(1, 2, 0).clamp(0, 1).numpy()
            oy, ox = (y-ya)*S, (x-xa)*S; h, w = min(T, H-y)*S, min(T, W-x)*S
            out[y*S:y*S+h, x*S:x*S+w] = r[oy:oy+h, ox:ox+w]
        print('row', y, flush=True)
Image.fromarray((out*255+0.5).astype(np.uint8)).save('up4.png')
