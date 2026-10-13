"""Bruitages du clip AIRO, synthétisés (aucun échantillon, aucune licence) : python3 tools/sfx.py
Une seule piste de 17,2 s calée sur le storyboard. Tonalité commune : ré (D), petite réverb de pièce, aléatoire graine fixe."""
import numpy as np, soundfile as sf, pathlib
SR = 48000; DUR = 17.2
rng = np.random.default_rng(7)
out = np.zeros(int(SR * DUR))
t_ = lambda d: np.arange(int(SR * d)) / SR
def env(n, a=0.004, d=0.25): t = np.arange(n) / SR; return np.clip(t / a, 0, 1) * np.exp(-t / d)
def place(at, x, g=1.0):
    i = int(at * SR); j = min(len(out), i + len(x)); out[i:j] += g * x[: j - i]
def lowpass(x, k):  # moyenne glissante simple
    return np.convolve(x, np.ones(k) / k, mode="same")
def thud(f=55, d=0.5):
    t = t_(d); f_t = f * (1 + 1.5 * np.exp(-t / 0.03)); ph = 2 * np.pi * np.cumsum(f_t) / SR
    return np.sin(ph) * env(len(t), 0.002, 0.12)
def marimba(f, d=0.6, b=0.3):
    t = t_(d); x = np.sin(2*np.pi*f*t) + b*np.sin(2*np.pi*f*4*t)*np.exp(-t/0.03) + 0.15*np.sin(2*np.pi*f*10*t)*np.exp(-t/0.008)
    return x * env(len(t), 0.002, d / 3.5)
def click(f=1800, d=0.06):
    t = t_(d); return (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2.7*t)) * env(len(t), 0.0008, 0.012)
def steam(d, swell=0.5):
    n = int(SR * d); x = lowpass(rng.standard_normal(n), 9) - lowpass(rng.standard_normal(n), 60) * 0.3
    t = np.arange(n) / SR; shape = np.clip(t / swell, 0, 1) * np.clip((d - t) / 0.4, 0, 1) * (0.75 + 0.25 * np.sin(2*np.pi*0.7*t))
    return x * shape * 0.35
def pad(fs, d, a=0.4, r=1.2):
    t = t_(d); x = sum(np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*2*f*t) for f in fs) / len(fs)
    return x * np.clip(t / a, 0, 1) * np.clip((d - t) / r, 0, 1)
D3, A3, D4, Fs4, A4, D5 = 146.83, 220.0, 293.66, 369.99, 440.0, 587.33
# 1 · accroche : un coup sourd sous chaque mot
place(0.12, thud(), 0.9); place(0.42, thud(49), 0.9); place(0.85, click(1200), 0.25)
# 2 · révélation : silence puis le projecteur claque (stab) + nappe grave
place(2.05, thud(41, 0.9) * 1.0); place(2.05, marimba(D4, 0.9, 0.5), 0.5); place(2.05, pad([D3, A3], 1.4, 0.05, 0.9), 0.18)
# 3 · programme : clics de l'écran, pastille 10 MIN
place(3.95, click(), 0.35); place(4.2, click(2100), 0.3); place(4.45, marimba(A4, 0.5), 0.45)
# 4 · vapeur : souffle qui monte, coupé net 0,3 s avant 100 %
s = steam(4.0); place(6.35, s, 0.9)
out[int(10.35 * SR): int(10.65 * SR)] *= np.linspace(1, 0, int(0.3 * SR))
out[int(10.65 * SR): int(10.95 * SR)] = 0
# 5 · prêt : carillon ré-fa#-la
for k, f in enumerate([D5, Fs4 * 2, A4 * 2]): place(11.25 + k * 0.12, marimba(f, 0.9, 0.25), 0.4)
# 6 · fin : le projecteur revient, accord tenu qui s'éteint
place(13.9, thud(41, 0.9), 0.7); place(14.0, pad([D3, Fs4 / 2, A3, D4], 3.2, 0.3, 1.6), 0.22)
# petite pièce
ir_n = int(SR * 0.35); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / (SR * 0.08))
L = len(out) + ir_n; wet = np.fft.irfft(np.fft.rfft(out, L) * np.fft.rfft(ir, L), L)[: len(out)];   out = out + 0.12 * wet / (np.abs(wet).max() + 1e-9) * np.abs(out).max()
out = out / (np.abs(out).max() + 1e-9) * 0.8
p = pathlib.Path(__file__).resolve().parent.parent / "assets" / "audio" / "sfx.wav"
sf.write(p, np.stack([out, out], 1).astype(np.float32), SR); print(p)
