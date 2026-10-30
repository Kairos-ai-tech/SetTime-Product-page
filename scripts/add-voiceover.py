#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

LINES = [
    (0.2, "Reading rebar off drawings. By eye. One sheet at a time."),
    (5.2, "Drawings in, material list out. Rebar by size, ready to price."),
    (11.2, "Upload a drawing, and pick the style guide. Your drawing conventions, set once per project."),
    (18.3, "Set Time reads the plan using your drawing conventions: seventeen beams, twelve columns."),
    (25.2, "Every drawing, filed by project."),
    (30.2, "Every gap is flagged. A person reviews before it is used."),
    (36.2, "Rebar by size, ready to price. Forty-nine rows, about five thousand one hundred kilograms in total."),
    (45.0, "From plan to three D. The same model, tilted and turned."),
    (54.2, "Review."),
    (55.8, "Acknowledge."),
    (57.4, "Download."),
    (59.6, "Set Time. Right before it sets."),
    (62.6, "Apply for a free pilot at settime dot kairos A I tech dot com."),
]
GAP = 0.15
CACHE = Path.home() / ".cache/hyperframes/tts"
MASTER = (
    "highpass=f=70,"
    "acompressor=threshold=-21dB:ratio=2.5:attack=12:release=220:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000"
)


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


def main():
    ap = argparse.ArgumentParser(description="Narrate assets/demo.mp4 with the Kokoro neural voice and mux it in")
    ap.add_argument("--video", default="assets/demo.mp4")
    ap.add_argument("--out", default=None)
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.92)
    ap.add_argument("--model", default=str(CACHE / "models/kokoro-v1.0.onnx"))
    ap.add_argument("--voices", default=str(CACHE / "voices/voices-v1.0.bin"))
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    import soundfile

    video = Path(args.video)
    out = Path(args.out) if args.out else video
    total = duration(video)
    model = load_model(args.model, args.voices)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        clips = []
        for i, (start, text) in enumerate(LINES):
            samples, rate = model.create(text, voice=args.voice, speed=args.speed, lang="en-us")
            raw = tmp / f"{i}.raw.wav"
            wav = tmp / f"{i}.wav"
            soundfile.write(raw, samples, rate)
            run([
                "ffmpeg", "-y", "-v", "error", "-i", str(raw), "-ar", "48000", "-ac", "1",
                "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB:stop_duration=0.3,afade=t=in:d=0.02",
                str(wav),
            ])
            clips.append((start, duration(wav), wav, text))

        bad = False
        for i, (start, dur, _, text) in enumerate(clips):
            end = start + dur
            limit = clips[i + 1][0] - GAP if i + 1 < len(clips) else total - 0.2
            flag = "" if end <= limit else "  OVERRUN"
            bad = bad or bool(flag)
            print(f"{start:5.1f}-{end:5.1f}  (limit {limit:5.1f}){flag}  {text[:60]}")
        if bad:
            sys.exit("a line overruns its slot: raise --speed or shorten the text")
        if args.check:
            return

        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
        for _, _, wav, _ in clips:
            cmd += ["-i", str(wav)]
        delays = "".join(
            f"[{i + 1}:a]adelay={int(start * 1000)}:all=1[a{i}];" for i, (start, _, _, _) in enumerate(clips)
        )
        mix = "".join(f"[a{i}]" for i in range(len(clips)))
        graph = f"{delays}{mix}amix=inputs={len(clips)}:normalize=0,{MASTER},apad,atrim=0:{total}[aout]"
        tmp_out = tmp / "out.mp4"
        cmd += [
            "-filter_complex", graph,
            "-map", "0:v:0", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
            "-movflags", "+faststart",
            str(tmp_out),
        ]
        run(cmd)
        out.write_bytes(tmp_out.read_bytes())
        print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB, {duration(out):.1f} s)")


if __name__ == "__main__":
    main()
