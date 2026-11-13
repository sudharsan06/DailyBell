"""Generates DailyBell's bell sounds. Every sound rings exactly 3 times, then stops.

Usage: python3 scripts/generate-bells.py   (from the project root; stdlib only)
Writes assets/sounds/*.wav and copies them to android/app/src/main/res/raw and
ios/DailyBell/Sounds (iOS notification sounds must be <= 30 s).

Notification sounds can't be scaled at runtime, so each bell is also written
pre-attenuated for every volume step below Max (<name>_vol<step>.wav).
Keep the curve in sync with bellVolumeGain() in src/data/defaultTimetable.ts.
"""
import glob, math, os, random, shutil, struct, wave

SR = 44100
RINGS = 3
# Volume slider: steps 1..10, each 2.5 dB louder; step 10 (Max) = the base file.
MAX_STEP, DB_PER_STEP = 10, 2.5
VOLUME_GAINS = {n: 10 ** (-(MAX_STEP - n) * DB_PER_STEP / 20) for n in range(1, MAX_STEP)}

def env_decay(t, attack=0.004, decay=0.35):
    if t < attack:
        return t / attack
    return math.exp(-(t - attack) / decay)

def bell_partials(freq, t, partials):
    return sum(a * math.sin(2 * math.pi * freq * r * t) * math.exp(-t * d)
               for r, a, d in partials)

def school_bell():
    """Three short bursts of a classic electric hall bell (clapper ~22 Hz)."""
    burst, gap = 0.55, 0.3
    total = RINGS * (burst + gap) + 0.6
    out = []
    for i in range(int(total * SR)):
        t = i / SR
        cycle = burst + gap
        k = int(t // cycle)
        local = t - k * cycle
        v = 0.0
        if k < RINGS:
            # strikes inside the burst, each decaying, plus ring-out after it
            hit_t = local % (1 / 22) if local < burst else local - burst + (1 / 22)
            tail = 1.0 if local < burst else math.exp(-(local - burst) / 0.12)
            body = bell_partials(1180, hit_t + 0.01,
                                 [(1, 0.6, 6), (2.76, 0.3, 9), (5.4, 0.15, 14)])
            v = body * tail * min(1, local / 0.01)
        elif k == RINGS and local < 0.6:
            pass
        out.append(v)
    return out

def soft_chime():
    """Three gentle rising chime strikes (G5, B5, D6)."""
    notes = [783.99, 987.77, 1174.66]
    step, ring = 0.62, 2.0
    total = step * (RINGS - 1) + ring
    out = [0.0] * int(total * SR)
    for n, f in enumerate(notes[:RINGS]):
        start = int(n * step * SR)
        for i in range(int(ring * SR)):
            t = i / SR
            v = bell_partials(f, t, [(1, 0.7, 1.6), (2.0, 0.25, 2.6), (3.01, 0.12, 4.0), (4.17, 0.06, 6.0)])
            out[start + i] += v * min(1, t / 0.003) * 0.8
    return out

def digital_beep():
    """Three short double-beeps (each pair counts as one ring)."""
    beep, inner, step = 0.09, 0.07, 0.7
    total = step * (RINGS - 1) + 2 * beep + inner + 0.15
    out = [0.0] * int(total * SR)
    for n in range(RINGS):
        for b in range(2):
            start = n * step + b * (beep + inner)
            for i in range(int(beep * SR)):
                t = i / SR
                edge = min(1, t / 0.004, (beep - t) / 0.004)
                out[int(start * SR) + i] += 0.55 * edge * math.copysign(1, math.sin(2 * math.pi * 1760 * t)) * 0.5 \
                    + 0.3 * edge * math.sin(2 * math.pi * 3520 * t)
    return out

def write_file(name, samples, gain):
    path = os.path.join('assets', 'sounds', name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * gain)) * 32767)) for s in samples))
    for dest in ('android/app/src/main/res/raw', 'ios/DailyBell/Sounds'):
        shutil.copy(path, os.path.join(dest, name))

def write(name, samples):
    peak = max(abs(s) for s in samples) or 1
    gain = 0.89 / peak
    write_file(name, samples, gain)
    stem, ext = os.path.splitext(name)
    for level, level_gain in VOLUME_GAINS.items():
        write_file(f'{stem}_vol{level}{ext}', samples, gain * level_gain)
    print(f'{name}: {len(samples) / SR:.2f}s (+{len(VOLUME_GAINS)} volume levels)')

if __name__ == '__main__':
    random.seed(1)
    # Drop variants from an older volume curve before writing the current ones.
    for dest in ('assets/sounds', 'android/app/src/main/res/raw', 'ios/DailyBell/Sounds'):
        for old in glob.glob(os.path.join(dest, 'bell_*_vol*.wav')):
            os.remove(old)
    write('bell_school.wav', school_bell())
    write('bell_chime.wav', soft_chime())
    write('bell_digital.wav', digital_beep())
