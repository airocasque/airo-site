import torch, numpy as np, cv2
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
name = "depth-anything/Depth-Anything-V2-Base-hf"
proc = AutoImageProcessor.from_pretrained(name); model = AutoModelForDepthEstimation.from_pretrained(name).eval()
im = Image.open('bg.png').convert('RGB')
with torch.no_grad(): pred = model(**proc(images=im, return_tensors="pt")).predicted_depth
d2 = torch.nn.functional.interpolate(pred[None], size=im.size[::-1], mode="bicubic", align_corners=False)[0, 0].numpy()
d = np.load('disp.npy')
mask = (cv2.imread('fgmask.png', 0) > 0)
big = cv2.dilate(mask.astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
ring = big & ~cv2.dilate(mask.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
A = np.stack([d2[~big], np.ones((~big).sum())], 1); a, b = np.linalg.lstsq(A, d[~big], rcond=None)[0]
d2a = a*d2 + b
w = cv2.GaussianBlur(cv2.dilate(mask.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 6)
out = d*(1-w) + d2a*w
np.save('disp_bg.npy', out.astype(np.float32))
lo, hi = out.min(), out.max(); cv2.imwrite('dbg_vis.jpg', cv2.resize(((out-lo)/(hi-lo)*255).astype(np.uint8), (838, 470)))
print('fit', a, b, 'ring err', np.abs(d2a[ring]-d[ring]).mean())
