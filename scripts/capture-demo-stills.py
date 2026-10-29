import argparse
import glob
import json
import os
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HIDE_CSS = """
html { scrollbar-width: none !important; }
html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
"""


def launch(p):
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/*.app/Contents/MacOS/*")))
    if found:
        return p.chromium.launch(executable_path=found[-1])
    return p.chromium.launch(channel="chrome")


def jobs(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('[data-job-id]')].map(e => ({id: e.dataset.jobId, status: (e.dataset.jobStatus || '').toLowerCase(), text: e.textContent.trim().replace(/\\s+/g, ' ')}))"""
    )


def wait_done(page, base, name, timeout=240):
    deadline = time.time() + timeout
    while time.time() < deadline:
        page.goto(f"{base}/Jobs")
        mine = [j for j in jobs(page) if name in j["text"]]
        if mine and mine[0]["status"] in ("done", "failed", "waitingforbars"):
            return mine[0]
        time.sleep(2)
    sys.exit(f"timeout waiting for {name}")


def main():
    ap = argparse.ArgumentParser(description="Capture the portal stills for the demo video from a local portal using a saved throwaway session.")
    ap.add_argument("--state", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--project", default="Sample Tower")
    ap.add_argument("hero", type=Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    state = json.loads(args.state.read_text())
    cookies = str(args.state.with_suffix(".cookies.json"))
    base = state["base"]

    with sync_playwright() as p:
        browser = launch(p)
        ctx = browser.new_context(locale="en-US", viewport={"width": 1920, "height": 1080}, storage_state=cookies)
        ctx.add_init_script(
            "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = "
            + repr(HIDE_CSS)
            + "; document.head.appendChild(s); const hide = () => document.querySelectorAll('body *').forEach((e) => { if (!e.children.length && /^(promo|howto)-[0-9a-f]+/.test(e.textContent.trim())) e.style.visibility = 'hidden'; }); hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true }); });"
        )
        page = ctx.new_page()

        page.goto(f"{base}/Jobs", wait_until="networkidle")
        if not page.locator("#upload[open]").count():
            page.click("#upload summary")
        page.set_input_files("#UploadedFile", str(args.hero))
        page.select_option("#ProjectId", label=args.project)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(args.out / "02-upload-form.png"))
        print("02")

        with page.expect_response(lambda r: "/Jobs/Upload" in r.url and r.request.method == "POST", timeout=60000):
            page.click("[data-upload-submit]")
        page.wait_for_load_state("load")
        page.wait_for_timeout(900)
        page.screenshot(path=str(args.out / "03-processing.png"))
        print("03")

        job = wait_done(page, base, args.hero.name)
        page.goto(f"{base}/Jobs?job={job['id']}", wait_until="networkidle")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(args.out / "04-drawings-detail.png"))
        print("04", job["id"])

        state.setdefault("jobs", {})[args.hero.name] = job
        args.state.write_text(json.dumps(state, indent=1))
        page.goto(f"{base}/Jobs/Materials/{job['id']}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=str(args.out / "07-materials-new.png"))
        print("07")

        page.goto(f"{base}/Jobs/Download/{job['id']}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(args.out / "09-download-export.png"))
        print("09")
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
