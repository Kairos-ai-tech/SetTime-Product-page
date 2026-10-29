import argparse
import glob
import os
import re
import secrets
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HIDE_CSS = """
.nav-user { visibility: hidden !important; }
html { scrollbar-width: none !important; }
html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
"""


def launch(p):
    found = sorted(glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/*.app/Contents/MacOS/*")))
    if found:
        return p.chromium.launch(executable_path=found[-1])
    return p.chromium.launch(channel="chrome")


def confirm_link(outbox, email):
    for _ in range(60):
        for mail in sorted(Path(outbox).glob("*"), key=lambda m: m.stat().st_mtime, reverse=True):
            text = mail.read_text(encoding="utf-8", errors="ignore").replace("&amp;", "&")
            if email in text:
                found = re.search(r"https?://[^\s\"'<>]*ConfirmEmail[^\s\"'<>]*", text)
                if found:
                    return found.group(0)
        time.sleep(0.5)
    sys.exit("no confirmation mail")


def job_list(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('[data-job-id]')].map(e => ({id: e.dataset.jobId, status: (e.dataset.jobStatus || '').toLowerCase(), text: e.textContent.trim().replace(/\\s+/g, ' ')}))"""
    )


def wait_done(page, base, name, timeout=240):
    deadline = time.time() + timeout
    while time.time() < deadline:
        page.goto(f"{base}/Jobs")
        mine = [j for j in job_list(page) if name in j["text"]]
        if mine and mine[0]["status"] in ("done", "failed", "waitingforbars"):
            return mine[0]
        time.sleep(2)
    sys.exit(f"timeout waiting for {name}")


def upload(page, base, path, project):
    page.goto(f"{base}/Jobs")
    if not page.locator("#upload[open]").count():
        page.click("#upload summary")
    page.set_input_files("#UploadedFile", str(path))
    page.select_option("#ProjectId", label=project)
    with page.expect_response(lambda r: "/Jobs/Upload" in r.url and r.request.method == "POST", timeout=60000):
        page.click("[data-upload-submit]")
    page.wait_for_load_state("networkidle")


def to_jpg(png, jpg, size=(900, 675)):
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(png), "-vf", f"scale={size[0]}:{size[1]}:flags=lanczos", "-q:v", "3", str(jpg)],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser(description="Register a throwaway local portal account, upload SYNTHETIC drawings, and capture the three How-to screenshots.")
    ap.add_argument("--base", default="http://127.0.0.1:5188")
    ap.add_argument("--promo", required=True)
    ap.add_argument("--outbox", required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--project", default="Sample Tower")
    ap.add_argument("--fillers", nargs="*", type=Path, default=[], help="drawings uploaded first so the project tree has finished rows")
    ap.add_argument("hero", type=Path, help="the drawing shown processing and then reviewed")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    email = f"howto-{secrets.token_hex(4)}@example.com"
    password = "Aa1!" + secrets.token_urlsafe(18)
    base = args.base

    with sync_playwright() as p:
        browser = launch(p)
        ctx = browser.new_context(locale="en-US", color_scheme="light", viewport={"width": 1200, "height": 900}, device_scale_factor=1.5)
        ctx.add_init_script(
            "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = "
            + repr(HIDE_CSS)
            + "; document.head.appendChild(s); });"
        )
        page = ctx.new_page()
        page.goto(f"{base}/culture/set?culture=en&returnUrl=/")
        page.goto(f"{base}/Account/Register")
        page.fill("#Input_Email", email)
        page.fill("#Input_Password", password)
        page.fill("#Input_ConfirmPassword", password)
        page.fill("#Input_PromoCode", args.promo)
        page.click("form:has(#Input_PromoCode) button[type=submit]")
        page.wait_for_load_state("networkidle")
        page.goto(confirm_link(args.outbox, email))
        page.wait_for_load_state("networkidle")
        if page.locator("#Input_Password").count():
            page.fill("#Input_Password", password)
            page.click("form:has(#Input_Code) button[type=submit]")
            page.wait_for_load_state("networkidle")
        if "/Account/Login" in page.url or page.locator("#Input_Password").count():
            page.goto(f"{base}/Account/Login")
            page.fill("#Input_Email", email)
            page.fill("#Input_Password", password)
            page.click("form:has(#Input_Password) button[type=submit]")
            page.wait_for_load_state("networkidle")
        page.goto(f"{base}/Jobs")
        if "/Account/Login" in page.url:
            sys.exit("sign-in failed")

        page.click(".tree-new summary")
        page.fill("#side-project-name", args.project)
        page.select_option("#side-project-style-guide", "sample")
        page.click("form.project-create button[type=submit]")
        page.wait_for_load_state("networkidle")

        for filler in args.fillers:
            upload(page, base, filler, args.project)
            wait_done(page, base, filler.name)

        upload(page, base, args.hero, args.project)
        page.wait_for_load_state("load")
        page.wait_for_timeout(800)
        page.screenshot(path=str(args.out / "1-upload.png"))

        job = wait_done(page, base, args.hero.name)
        page.goto(f"{base}/Jobs/View/{job['id']}", wait_until="networkidle")
        page.wait_for_timeout(2500)
        page.screenshot(path=str(args.out / "2-review-full.png"), full_page=True)

        page.goto(f"{base}/Jobs/Materials/{job['id']}", wait_until="networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(args.out / "3-materials-full.png"), full_page=True)
        browser.close()
    print("job", job)


if __name__ == "__main__":
    sys.exit(main())
