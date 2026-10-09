# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SetTime (formerly AI學徒 iTech) — a product page / strategy documentation project for an AI + AR construction-execution platform. Business strategy documentation lives alongside a static marketing/product landing page (vanilla HTML/CSS/JS, no build step) for the AI + AR construction-execution product line.

## Repository Contents

- `README.md` — Product overview: pipeline, what's shipping vs. in development, competitive positioning, tech stack
- `AI學徒-iTech商業策略書簡報.pdf` — Legacy business strategy deck from the original craft-skill-training pivot (Chinese) — predates the rebrand to SetTime/rebar-construction; kept for historical reference, not current strategy
- `index.html`, `styles.css`, `script.js`, `effects.js`, `hero3d.js`, `i18n.js` — the product landing page: static HTML/CSS with a Three.js rebar-cage backdrop (scroll-scrubbed flythrough during the hero, then a fixed translucent background for the rest of the page) and client-side i18n (8 languages). `effects.js` is the motion layer: Lenis smooth scroll, GSAP/ScrollTrigger reveals, react-bits-style vanilla effects (spotlight cards, magnetic buttons, shiny text), and a lazy Vanta NET backdrop on the pilot section. It no-ops under `prefers-reduced-motion` or if the vendored libs fail to load
- `vendor/` — vendored third-party libs (three, gsap + ScrollTrigger, lenis, vanta.net); no CDN dependency
- `llms.txt`, `sitemap.xml`, `robots.txt` — SEO/AEO/GEO: machine-readable product summary and crawl configuration

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Drawing automation | AutoCAD 2021 plugin, .NET, Avalonia (cross-platform desktop) |
| AR field guidance | ARKit, RealityKit |
| Computer vision | PyTorch, Open3D |
| Product page | Vanilla HTML/CSS/JS, Three.js, GSAP + ScrollTrigger, Lenis, Vanta |

## Key Domain Concepts

- **結構施工圖數位化**: The structural drawing is the single source of truth — parsed once into bar-schedule/cut-list/bend-list data that drives every downstream step (fabrication, AR guidance, verification)
- **AR即時指導**: Real-time AR overlay of the 3D rebar layout on formwork during field placement (green = correct position, red = deviation)
- **AI 竣工驗證**: Computer-vision comparison of as-built vs. as-designed rebar, producing a pass/fail per requirement and a signed pre-pour snapshot
- **稽核鏈 (audit trail)**: SHA-256 hash-chained, append-only, timestamped record of pipeline actions, built for government/enterprise compliance review
- Current focus: rebar/structural construction in Taiwan. Roadmap targets adjacent trades: CNC machining, mold making, welding, auto repair, plumbing, sheet metal

## Language

The product page and `README.md` are in Traditional Chinese / English (繁體中文 primary, 8 languages total). The legacy PDF business deck is Traditional Chinese, written for the original craft-skill-training pitch — do not treat it as authoritative for the current product.
