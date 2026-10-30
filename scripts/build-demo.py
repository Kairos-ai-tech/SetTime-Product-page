#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SOURCE_REF = "97440be:assets/demo.mp4"
SPEED = 1.25
FADE_OUT = 0.5
GAP = 0.15
SR = 48000
BPM = 100
CACHE = Path.home() / ".cache/hyperframes/tts"

SCENES = [
    (0.0, 4.6, 0.15, "Reading rebar off drawings, by eye."),
    (5.0, 10.2, 0.2, "Drawings in, material list out."),
    (11.0, 16.8, 0.2, "Upload a drawing. Pick your style guide."),
    (18.0, 24.3, 0.3, "Set Time reads your drawing, member by member."),
    (25.0, 29.2, 0.2, "Filed by project."),
    (30.0, 34.0, 0.2, "Every gap flagged. A person reviews."),
    (36.0, 43.2, 0.2, "Rebar by size, ready to price."),
    (44.0, 50.5, 0.3, "From plan, to three D."),
    (54.0, 58.4, 0.1, "Review. Acknowledge. Download."),
    (59.0, 65.6, 0.4, "Set Time. Apply for a free pilot."),
]

VOICE_MASTER = "highpass=f=70,acompressor=threshold=-21dB:ratio=2.5:attack=12:release=220:makeup=2"
MIX_MASTER = "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000"

CHORDS = [
    (110.00, [220.00, 261.63, 329.63, 493.88]),
    (87.31, [174.61, 220.00, 261.63, 329.63]),
    (130.81, [261.63, 329.63, 392.00, 587.33]),
    (98.00, [196.00, 246.94, 293.66, 329.63]),
]
ARP = [0, 2, 1, 3, 2, 3, 1, 2]


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
    return float(json.loads(out)["format"]["duration"])


def load_model(model, voices):
    import espeakng_loader
    import kokoro_onnx

    data = Path(espeakng_loader.get_data_path())
    if not (data.parent.parent / "phontab").exists():
        shutil.copytree(data, data.parent.parent, dirs_exist_ok=True)
    for p in (model, voices):
        if not Path(p).exists():
            sys.exit(f"missing {p}: run `npx hyperframes tts hi` once to download the Kokoro model files")
    return kokoro_onnx.Kokoro(str(model), str(voices))


def make_music(path, length):
    import numpy as np
    import soundfile

    n = int(length * SR)
    t = np.arange(n) / SR
    beat = 60.0 / BPM
    bar = beat * 4
    left = np.zeros(n)
    right = np.zeros(n)

    def add(buf, start, sig, gain):
        i = int(start * SR)
        if i < 0:
            sig = sig[-i:]
            i = 0
        if i >= n:
            return
        sig = sig[: n - i]
        buf[i : i + len(sig)] += sig * gain

    def tone(freq, dur, decay=None, harm=0.0):
        tt = np.arange(int(dur * SR)) / SR
        s = np.sin(2 * np.pi * freq * tt) + harm * np.sin(4 * np.pi * freq * tt)
        if decay is None:
            env = np.minimum(1, tt / 0.35) * np.minimum(1, (dur - tt) / 0.5)
        else:
            env = np.minimum(1, tt / 0.005) * np.exp(-tt * decay)
        return s * env

    bars = int(np.ceil(length / bar)) + 1
    for b in range(bars):
        root, tones = CHORDS[b % len(CHORDS)]
        s0 = b * bar
        for f in tones:
            add(left, s0 - 0.2, tone(f * 0.9985, bar + 0.4, harm=0.3), 0.07)
            add(right, s0 - 0.2, tone(f * 1.0015, bar + 0.4, harm=0.3), 0.07)
        for step in (0.0, 1.5):
            add(left, s0 + step * beat, tone(root, beat * 1.2, decay=4.0), 0.30)
            add(right, s0 + step * beat, tone(root, beat * 1.2, decay=4.0), 0.30)
        for k in range(8):
            f = tones[ARP[k] % len(tones)] * 2
            pl = 0.65 if k % 2 == 0 else 0.35
            p = tone(f, 0.9, decay=8.0, harm=0.25)
            add(left, s0 + k * beat / 2, p, 0.16 * pl * 2)
            add(right, s0 + k * beat / 2, p, 0.16 * (1 - pl) * 2)
        if b >= 1:
            for step in (0.0, 2.0):
                tt = np.arange(int(0.35 * SR)) / SR
                phase = 2 * np.pi * (45 * tt + 65 * (1 - np.exp(-tt * 22)) / 22)
                kick = np.sin(phase) * np.exp(-tt * 13)
                add(left, s0 + step * beat, kick, 0.38)
                add(right, s0 + step * beat, kick, 0.38)

    fade_in = np.minimum(1, t / 0.8)
    fade_out = np.minimum(1, np.maximum(0, (length - t) / 2.0))
    stereo = np.stack([left, right], axis=1) * (fade_in * fade_out)[:, None]
    stereo *= 0.7 / max(1e-9, np.abs(stereo).max())
    soundfile.write(path, stereo, SR)


def main():
    ap = argparse.ArgumentParser(description="Tighten the demo video, add a neural voiceover and background music")
    ap.add_argument("--src", default=None)
    ap.add_argument("--out", default="assets/demo.mp4")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--music", type=float, default=0.18)
    ap.add_argument("--model", default=str(CACHE / "models/kokoro-v1.0.onnx"))
    ap.add_argument("--voices", default=str(CACHE / "voices/voices-v1.0.bin"))
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    import soundfile

    model = load_model(args.model, args.voices)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src = Path(args.src) if args.src else tmp / "source.mp4"
        if not args.src:
            src.write_bytes(subprocess.run(["git", "show", SOURCE_REF], check=True, capture_output=True).stdout)

        starts, cursor = [], 0.0
        for a, b, _, _ in SCENES:
            starts.append(cursor)
            cursor += (b - a) / SPEED
        total = cursor

        clips = []
        for i, (a, b, offset, text) in enumerate(SCENES):
            samples, rate = model.create(text, voice=args.voice, speed=args.speed, lang="en-us")
            raw, wav = tmp / f"{i}.raw.wav", tmp / f"{i}.wav"
            soundfile.write(raw, samples, rate)
            run([
                "ffmpeg", "-y", "-v", "error", "-i", str(raw), "-ar", "48000", "-ac", "1",
                "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,afade=t=in:d=0.02",
                str(wav),
            ])
            clips.append((starts[i] + offset, duration(wav), wav, text, starts[i] + (b - a) / SPEED))

        bad = False
        for i, (start, dur, _, text, scene_end) in enumerate(clips):
            end = start + dur
            limit = min(scene_end - 0.05, clips[i + 1][0] - GAP) if i + 1 < len(clips) else total - 0.2
            flag = "" if end <= limit else "  OVERRUN"
            bad = bad or bool(flag)
            print(f"{start:5.1f}-{end:5.1f}  (limit {limit:5.1f}){flag}  {text[:58]}")
        print(f"total {total:.1f} s")
        if bad:
            sys.exit("a line overruns its scene: shorten the text or raise --speed")
        if args.check:
            return

        music = tmp / "music.wav"
        make_music(music, total + 0.5)

        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src)]
        for _, _, wav, _, _ in clips:
            cmd += ["-i", str(wav)]
        cmd += ["-i", str(music)]
        mi = len(clips) + 1

        trims = "".join(
            f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}];" for i, (a, b, _, _) in enumerate(SCENES)
        )
        concat = "".join(f"[v{i}]" for i in range(len(SCENES))) + f"concat=n={len(SCENES)}:v=1:a=0,"
        video = f"{concat}setpts=PTS/{SPEED},fps=30,fade=t=out:st={total - FADE_OUT}:d={FADE_OUT}[vout];"
        delays = "".join(
            f"[{i + 1}:a]adelay={int(s * 1000)}:all=1[a{i}];" for i, (s, _, _, _, _) in enumerate(clips)
        )
        voice_in = "".join(f"[a{i}]" for i in range(len(clips)))
        audio = (
            f"{delays}{voice_in}amix=inputs={len(clips)}:normalize=0,{VOICE_MASTER},apad,atrim=0:{total}[vo];"
            f"[vo]asplit=2[vo1][vo2];"
            f"[{mi}:a]volume={args.music},atrim=0:{total}[m];"
            f"[m][vo1]sidechaincompress=threshold=0.02:ratio=8:attack=25:release=600[md];"
            f"[vo2]aformat=channel_layouts=stereo[vos];"
            f"[md][vos]amix=inputs=2:normalize=0,{MIX_MASTER},atrim=0:{total}[aout]"
        )
        tmp_out = tmp / "out.mp4"
        cmd += [
            "-filter_complex", trims + video + audio,
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
            str(tmp_out),
        ]
        run(cmd)
        out = Path(args.out)
        out.write_bytes(tmp_out.read_bytes())
        print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB, {duration(out):.1f} s)")


if __name__ == "__main__":
    main()
