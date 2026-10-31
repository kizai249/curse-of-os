"""USERS-X trailer score — original, fully synthesised (no samples).
Cue times match the T table in trailer.html."""
import numpy as np, wave, sys

SR = 48000; DUR = 45.0; N = int(SR * DUR)
L = np.zeros(N); Rch = np.zeros(N)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); Rch[i:j] += s * np.sqrt(0.5 * (1 + pan))

def env(n, a=0.005, r=0.3, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * np.maximum(0, t - a) / max(r, 1e-4))
    return e

def sine(f, d, ph=0):
    t = np.arange(int(d * SR)) / SR
    if callable(f): return np.sin(2 * np.pi * np.cumsum(f(t)) / SR + ph)
    return np.sin(2 * np.pi * f * t + ph)

def square(f, d, duty=0.5):
    t = np.arange(int(d * SR)) / SR
    return np.where((t * f) % 1 < duty, 1.0, -1.0)

def noise(d): return rng.standard_normal(int(d * SR))

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):  # small signals only
        acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y

def lp_fast(x, fc):  # FFT brickwall-ish lowpass with soft knee
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))

def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4); return np.fft.irfft(X, len(x))

# ---------- instruments ----------
def kick(gain=1.0):
    d = 0.45; fsweep = lambda t: 45 + 110 * np.exp(-t * 28)
    return sine(fsweep, d) * env(int(d * SR), 0.002, 0.18, 3) * gain

def impact(size=1.0):
    d = 3.0
    boom = sine(lambda t: 32 + 70 * np.exp(-t * 9), d) * env(int(d * SR), 0.003, 0.9 * size, 2.2)
    n = lp_fast(noise(d), 900) * env(int(d * SR), 0.001, 0.35 * size, 3) * 0.5
    crack = hp_fast(noise(0.12), 2500) * env(int(0.12 * SR), 0.0005, 0.03, 3) * 0.35
    out = boom + n; out[: len(crack)] += crack
    return out * size

def whoosh(d, rise=True):
    n = noise(d); x = np.linspace(0, 1, len(n))
    shaped = lp_fast(n, 1800) * (x ** 2 if rise else (1 - x) ** 2)
    return shaped * 0.5

def blip(f, d=0.07, gain=0.25):
    return square(f, d, 0.25) * env(int(d * SR), 0.001, d * 0.5, 3) * gain

def ping(f0=1760, f1=880, d=0.9):
    s = sine(lambda t: f1 + (f0 - f1) * np.exp(-t * 18), d) * env(int(d * SR), 0.002, 0.35, 3)
    return s * 0.35

def hat(gain=0.12):
    d = 0.06; return hp_fast(noise(d), 7000) * env(int(d * SR), 0.0005, 0.02, 3) * gain

def riser(d):
    n = int(d * SR); x = np.linspace(0, 1, n)
    saw = 2 * ((np.cumsum(110 + 900 * x ** 2.2) / SR) % 1) - 1
    nz = hp_fast(noise(d), 1500) * x ** 3
    return (lp_fast(saw, 3000) * 0.18 + nz * 0.35) * x ** 1.5

def pad(freqs, d, gain=0.12, a=1.5, r=2.0):
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for i, f in enumerate(freqs))
    e = np.minimum(1, t / a) * np.minimum(1, np.maximum(0, (d - t)) / r)
    return s * e * gain / len(freqs)

# ---------- score ----------
# 0–31.6 sub drone, slowly opening
dr_end = 31.6; n = int(dr_end * SR); tt = np.arange(n) / SR
drone = (np.sin(2 * np.pi * 41 * tt) + 0.6 * np.sin(2 * np.pi * 41.6 * tt) + 0.3 * np.sin(2 * np.pi * 82 * tt))
drone *= np.minimum(1, tt / 3) * (0.25 + 0.5 * (tt / dr_end) ** 1.5) * 0.35
add(drone, 0)
# S1 signal pulses
for k in (1.2, 2.4, 3.6):
    add(ping(), k, pan=-0.3 + 0.3 * (k - 1.2), gain=1.0); add(kick(0.7), k)
add(whoosh(1.2), 3.8, gain=0.8)
# S2 awakening
add(impact(1.0), 5.0)
add(whoosh(2.2, rise=False), 5.2, pan=-0.5, gain=0.7)  # magenta sweep
add(impact(1.3), 7.5)
for i, k in enumerate(np.arange(8.6, 11.2, 0.325)):  # stepped arm shifts
    add(blip(220 * (1.5 if i % 2 else 1)), k, pan=(-0.4 if i % 2 else 0.4), gain=1.2)
add(pad([110, 164.8, 220], 6.0, gain=0.10), 6.0)
add(riser(0.9), 11.1, gain=0.9)
# S3 worlds — 120 bpm pulse from 12 to 22
beat = 0.5
for k in np.arange(12, 22, beat):
    add(kick(0.85), k)
    add(hat(), k + beat / 2, pan=0.3)
for k in (12, 14.5, 17, 19.5):
    add(impact(0.9), k); add(whoosh(0.5), k - 0.5, gain=0.7)
world_notes = [(55, 82.4), (61.7, 92.5), (65.4, 98), (73.4, 110)]
for k, (a, b) in zip((12, 14.5, 17, 19.5), world_notes):
    add(pad([a * 2, b * 2, a * 4], 2.5, gain=0.12, a=0.05, r=0.6), k)
# S4 climax — double time + riser into flash
for k in np.arange(22, 27, beat):
    add(kick(1.0), k); add(hat(0.14), k + beat / 2)
for k in np.arange(27, 31.5, beat / 2):
    add(kick(1.0), k); add(hat(0.16), k + beat / 4, pan=-0.3)
add(impact(1.0), 22.0); add(impact(1.1), 27.0)
add(riser(9.5), 22.1, gain=1.0)
# collapse: reverse swell
d = 1.1; rev = (lp_fast(noise(d), 1200) * np.linspace(0, 1, int(d * SR)) ** 3)
add(rev, 30.5, gain=0.9)
add(impact(1.8), 31.6)
# hard silence 31.75–32.8 is handled by the mute gate below
# S5 logo build — 8-bit arpeggio as voxels land
arp = [523.25, 659.25, 783.99, 1046.5]
for i, k in enumerate(np.arange(32.8, 35.3, 1 / 12)):
    add(blip(arp[i % 4] / (2 if i < 12 else 1), 0.06, 0.16), k, pan=np.sin(i) * 0.6)
add(impact(1.2), 35.5)
add(pad([65.4, 98, 130.8, 196], 6.0, gain=0.16, a=0.02, r=2.5), 35.5)
add(ping(2093, 1568, 1.4), 36.9, gain=0.9)  # wordmark shimmer
# S6 message
add(impact(1.0), 38.0); add(pad([73.4, 110, 146.8], 2.5, gain=0.12, a=0.05, r=0.8), 38.0)
add(impact(1.3), 40.5); add(pad([87.3, 130.8, 174.6], 2.1, gain=0.14, a=0.05, r=0.8), 40.5)
# brand sting
sting_t = 42.6
for i, f in enumerate([261.63, 392.0, 523.25, 659.25]):
    add(square(f, 0.12, 0.25) * env(int(0.12 * SR), 0.001, 0.08, 2) * 0.16, sting_t + i * 0.08, pan=-0.4 + i * 0.25)
add(pad([130.8, 196, 261.6, 329.6], 2.4, gain=0.18, a=0.02, r=1.8), sting_t + 0.32)
add(impact(1.1), sting_t + 0.32)

# ---------- master ----------
mix = np.stack([L, Rch])
# simple stereo reverb: exponentially decaying noise IR
ir_len = int(1.8 * SR); irt = np.arange(ir_len) / SR
irs = [rng.standard_normal(ir_len) * np.exp(-irt * 3.2) for _ in range(2)]
for c in range(2):
    wet = np.fft.irfft(np.fft.rfft(mix[c], N + ir_len) * np.fft.rfft(irs[c], N + ir_len))[:N]
    wet = lp_fast(wet, 5000)
    mix[c] = mix[c] + wet * (0.18 / np.std(irs[c]) / np.sqrt(ir_len) * 6)
# silence beat before the logo (31.75–32.8), short fades
g = np.ones(N)
a, b = int(31.75 * SR), int(32.8 * SR); f = int(0.05 * SR)
g[a:b] = 0; g[a - f:a] = np.linspace(1, 0, f)
# fade in/out
g[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
fo = int(1.2 * SR); g[N - fo:] *= np.linspace(1, 0, fo) ** 2
mix *= g
# remove DC / sub-rumble below 25 Hz, soft limit
for c in range(2): mix[c] = hp_fast(mix[c], 25)
mix = mix / np.max(np.abs(mix)) * 1.4
mix = np.tanh(mix) / np.tanh(1.4) * 0.89  # ~ -1 dBFS peak
pcm = (mix.T * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', pcm.shape)
