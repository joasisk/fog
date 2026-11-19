"""Generate original provisional Fog cues using only the Python standard library."""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 24000
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"
OUTPUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(7231)
tau = math.tau


def noise(length, smoothing):
    raw = [rng.uniform(-1, 1) for _ in range(length)]
    state = 0
    for value in raw:
        state += smoothing * (value - state)
    values = []
    for value in raw:
        state += smoothing * (value - state)
        values.append(state)
    return values


def write(name, channels):
    with wave.open(str(OUTPUT / f"{name}.wav"), "wb") as file:
        file.setparams((len(channels), 2, RATE, 0, "NONE", "not compressed"))
        file.writeframes(b"".join(
            struct.pack("<h", round(32767 * max(-1, min(1, value))))
            for frame in zip(*channels) for value in frame
        ))


def envelope(t, duration, attack, release):
    return max(0, min(1, t / attack, (duration - t) / release))


length = 8 * RATE
common = noise(length, .08)
write("soft-rain", [
    [.19 * body + .16 * grit for body, grit in zip(common, noise(length, .48))]
    for _ in range(2)
])

duration = 1.8
hiss = noise(round(RATE * duration), .22)
write("milk-steamer", [[
    .56 * value * envelope(i / RATE, duration, .12, .46)
    * (.8 + .2 * math.sin(tau * 7 * i / RATE))
    for i, value in enumerate(hiss)
]])

duration = 3.4
murmur = [0.] * round(duration * RATE)
for voice in range(7):
    pitch = rng.uniform(105, 225)
    speed = rng.uniform(2.7, 4.6)
    offset = rng.uniform(0, duration)
    phase = 0
    for i in range(len(murmur)):
        t = i / RATE
        phase += tau * pitch * (1 + .09 * math.sin(tau * .9 * (t + offset))) / RATE
        syllable = max(0, math.sin(tau * speed * (t + offset))) ** 1.6
        formant = 680 + 220 * math.sin(tau * 1.1 * (t + offset))
        voiced = sum(math.sin(h * phase) * math.exp(-((pitch * h - formant) / 290) ** 2) / h
                     for h in range(1, 10))
        murmur[i] += .18 * voiced * syllable * envelope(t, duration, .48, .65)
write("cafe-murmur", [murmur])

duration = 1.65
chime = []
for i in range(round(duration * RATE)):
    t = i / RATE
    sample = 0
    for delay, pitch in ((0, 670), (.12, 895)):
        age = t - delay
        if age >= 0:
            sample += min(1, age / .008) * math.exp(-5 * age) * (
                .18 * math.sin(tau * pitch * age) + .045 * math.sin(tau * pitch * 2.13 * age))
    chime.append(sample * envelope(t, duration, .008, .2))
write("door-chime", [chime])

duration = 1.1
paper = noise(round(duration * RATE), .39)
write("page-turn", [[
    .31 * value * envelope(i / RATE, duration, .18, .27)
    * math.sin(math.pi * i / (duration * RATE)) ** 2
    for i, value in enumerate(paper)
]])

for take_index in range(1, 3):
    duration = 3.1
    steps = noise(round(RATE * duration), .44)
    step_levels = [rng.uniform(.53, 1) for _ in range(6)]
    write(f"wet-footsteps-{take_index}", [[
        .54 * grain * sum(
            envelope(t - strike, .19, .012, .16) * strength
            for strike, strength in zip((.15, .64, 1.13, 1.63, 2.12, 2.63), step_levels)
        )
        for i, grain in enumerate(steps)
        for t in (i / RATE,)
    ]])

duration = 4.1
road_noise = noise(round(RATE * duration), .065)
write("passing-car", [[
    envelope(t, duration, 1.7, 1.8) * (
        grain * .52 + .048 * math.sin(tau * (117 * t - 5 * t * t))
    )
    for i, grain in enumerate(road_noise)
    for t in (i / RATE,)
]])

duration = 2.4
laughter = []
phase = 0
for i in range(round(duration * RATE)):
    t = i / RATE
    phase += tau * (425 - 52 * t + 38 * math.sin(tau * 1.2 * t)) / RATE
    rhythm = max(0, math.sin(tau * 4.6 * t)) ** 1.2
    voiced = math.sin(phase) + .54 * math.sin(2 * phase) + .31 * math.sin(3 * phase)
    breath = .07 * rng.uniform(-1, 1)
    laughter.append((.14 * voiced + breath) * rhythm * envelope(t, duration, .26, .68))
write("park-laughter", [laughter])
