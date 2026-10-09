# Décor 3D à partir d'une photo (concession)

Ordre d'exécution (Python, CPU suffisant) depuis un dossier de travail contenant `clean.png` (photo, enseigne tierce retirée) :

1. `depth.py` : carte de profondeur (Depth Anything V2 Base) → `disp.npy`
2. `up.py` : agrandissement ×4 (Real-ESRGAN x4plus, via spandrel) → `up4.png`
3. `mask.py` : masque des motos du premier plan d'après la profondeur → `fgmask.png`
4. `lama.py` : fond sans les motos (LaMa) → `bg.png` ; puis `up.py` sur `bg.png` → `up4_bg.png`
5. `depthbg.py` : profondeur du fond reconstitué, recalée sur l'originale → `disp_bg.npy`
6. `export.py` : calibration (sol à plat, œil à 1,6 m, décalage de disparité B = 5), repère monde,
   cibles de caméra → `scene.json`, `depth-bg16.png`, `depth-fg16.png`

Les textures `shop-bg-*.webp` / `shop-fg-*.webp` (calque des motos avec alpha) sont ensuite tirées de
`up4_bg.png` et `up4.png` en 4096 et 2048 px. Poids des modèles : `RealESRGAN_x4plus.pth`, `big-lama.pt`.
