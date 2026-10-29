import argparse
import glob
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

MASK = (
    "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); "
    "s.textContent = 'html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none!important}'; document.head.appendChild(s); "
    "const hide = () => document.querySelectorAll('body *').forEach((e) => { if (!e.children.length && /^(promo|howto)-[0-9a-f]+/.test(e.textContent.trim())) e.style.visibility = 'hidden'; }); "
    "hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true }); });"
)


def launch(p):
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/*.app/Contents/MacOS/*")))
    if found:
        return p.chromium.launch(executable_path=found[-1])
    return p.chromium.launch(channel="chrome")


def main():
    ap = argparse.ArgumentParser(description="Capture the export page (empty and filled) and a DPR2 material-table crop for an existing job.")
    ap.add_argument("--state", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--job", required=True)
    ap.add_argument("--reviewer", default="Reviewing Engineer")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    base = json.loads(args.state.read_text())["base"]
    cookies = str(args.state.with_suffix(".cookies.json"))

    with sync_playwright() as p:
        browser = launch(p)
        ctx = browser.new_context(locale="en-US", viewport={"width": 1920, "height": 1080}, storage_state=cookies)
        ctx.add_init_script(MASK)
        page = ctx.new_page()
        page.goto(f"{base}/Jobs/Download/{args.job}", wait_until="networkidle")
        page.wait_for_timeout(1000)
        page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(800)
        page.screenshot(path=str(args.out / "09-download-export.png"))
        page.fill("input[name=ReviewedBy]", args.reviewer)
        page.check("input[name=Acknowledged][type=checkbox]")
        page.wait_for_timeout(500)
        page.screenshot(path=str(args.out / "09-download-export-filled.png"))
        ctx.close()

        ctx = browser.new_context(locale="en-US", viewport={"width": 1920, "height": 1080}, device_scale_factor=2, storage_state=cookies)
        ctx.add_init_script(MASK)
        page = ctx.new_page()
        page.goto(f"{base}/Jobs/Materials/{args.job}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        box = page.evaluate(
            """() => { const t = [...document.querySelectorAll('table')][0]; const r = t.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }"""
        )
        print("table", box)
        pad = 20
        clip = {"x": box["x"] - pad, "y": box["y"] - pad, "width": box["width"] + 2 * pad, "height": box["height"] + 2 * pad}
        page.screenshot(path=str(args.out / "07-materials-zoom.png"), clip=clip)
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
