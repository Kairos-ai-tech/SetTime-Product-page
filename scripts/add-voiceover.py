#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

LINES = [
    (0.2, "Reading rebar off drawings. By eye. One sheet at a time."),
    (5.2, "Drawings in, material list out. Rebar by size, ready to price."),
    (11.2, "Upload a drawing, and pick the style guide. Your drawing conventions, set once per project."),
    (18.3, "SetTime reads the plan using your drawing conventions: seventeen beams, twelve columns."),
    (25.2, "Every drawing, filed by project."),
    (30.2, "Every gap is flagged. A person reviews before it is used."),
    (36.2, "Rebar by size, ready to price. Forty-nine rows, about five thousand one hundred kilograms in total."),
    (45.0, "From plan to three-D. The same model, tilted and turned."),
    (54.2, "Review."),
    (55.8, "Acknowledge."),
    (57.4, "Download."),
    (59.6, "SetTime. Right before it sets."),
    (62.6, "Apply for a free pilot at settime dot kairosaitech dot com."),
]
GAP = 0.15


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
    return float(json.loads(out)["format"]["duration"])


def main():
    ap = argparse.ArgumentParser(description="Narrate assets/demo.mp4 with a system voice and mux it in")
    ap.add_argument("--video", default="assets/demo.mp4")
    ap.add_argument("--out", default=None)
    ap.add_argument("--voice", default="Samantha")
    ap.add_argument("--rate", type=int, default=170)
    ap.add_argument("--volume", type=float, default=1.0)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    video = Path(args.video)
    out = Path(args.out) if args.out else video
    total = duration(video)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        clips = []
        for i, (start, text) in enumerate(LINES):
            aiff = tmp / f"{i}.aiff"
            wav = tmp / f"{i}.wav"
            run(["say", "-v", args.voice, "-r", str(args.rate), "-o", str(aiff), text])
            run(["ffmpeg", "-y", "-v", "error", "-i", str(aiff), "-ar", "48000", "-ac", "1", str(wav)])
            clips.append((start, duration(wav), wav, text))

        bad = False
        for i, (start, dur, _, text) in enumerate(clips):
            end = start + dur
            limit = clips[i + 1][0] - GAP if i + 1 < len(clips) else total - 0.2
            flag = "" if end <= limit else "  OVERRUN"
            bad = bad or bool(flag)
            print(f"{start:5.1f}-{end:5.1f}  (limit {limit:5.1f}){flag}  {text[:60]}")
        if bad:
            sys.exit("a line overruns its slot: raise --rate or shorten the text")
        if args.check:
            return

        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
        for _, _, wav, _ in clips:
            cmd += ["-i", str(wav)]
        delays = "".join(
            f"[{i + 1}:a]adelay={int(start * 1000)}:all=1[a{i}];" for i, (start, _, _, _) in enumerate(clips)
        )
        mix = "".join(f"[a{i}]" for i in range(len(clips)))
        graph = f"{delays}{mix}amix=inputs={len(clips)}:normalize=0,volume={args.volume},apad,atrim=0:{total}[aout]"
        tmp_out = tmp / "out.mp4"
        cmd += [
            "-filter_complex", graph,
            "-map", "0:v:0", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(tmp_out),
        ]
        run(cmd)
        out.write_bytes(tmp_out.read_bytes())
        print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB, {duration(out):.1f} s)")


if __name__ == "__main__":
    main()
