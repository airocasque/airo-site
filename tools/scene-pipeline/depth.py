import torch, numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
name = "depth-anything/Depth-Anything-V2-Base-hf"
proc = AutoImageProcessor.from_pretrained(name); model = AutoModelForDepthEstimation.from_pretrained(name).eval()
im = Image.open('clean.png').convert('RGB')
# entrée plus fine que 518 pour mieux suivre les contours
inputs = proc(images=im, return_tensors="pt", size={"height": 518*2 // 14 * 14 // 2 * 2, "width": 924}) if False else proc(images=im, return_tensors="pt")
with torch.no_grad(): pred = model(**inputs).predicted_depth
d = torch.nn.functional.interpolate(pred[None], size=im.size[::-1], mode="bicubic", align_corners=False)[0, 0].numpy()
np.save('disp.npy', d)
v = (d - d.min()) / (d.max() - d.min())
Image.fromarray((v * 255).astype(np.uint8)).save('disp_vis.png')
print(d.shape, d.min(), d.max())
