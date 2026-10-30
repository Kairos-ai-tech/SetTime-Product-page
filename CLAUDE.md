# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SetTime (formerly AI學徒 iTech) — a product page / strategy documentation project for an AI + AR construction-execution platform. Business strategy documentation lives alongside a static marketing/product landing page (vanilla HTML/CSS/JS, no build step) for the AI + AR construction-execution product line.

## Repository Contents

- `README.md` — Product overview: pipeline, what's shipping vs. in development, competitive positioning, tech stack
- `AI學徒-iTech商業策略書簡報.pdf` — Legacy business strategy deck from the original craft-skill-training pivot (Chinese) — predates the rebrand to SetTime/rebar-construction; kept for historical reference, not current strategy
- `index.html`, `styles.css`, `script.js`, `demo.js`, `effects.js`, `hero3d.js`, `i18n.js` — the product landing page: static HTML/CSS with a Three.js rebar-cage backdrop (scroll-scrubbed flythrough during the hero, then a fixed translucent background for the rest of the page) and client-side i18n (8 languages). `demo.js` is the 2D/3D rebar figure in `#demo`: one bar model (slab, 2 beams, 4 columns) projected to SVG, top-down for 2D and tilted isometric for 3D, with the bar schedule and stirrup gauge wired to it. `effects.js` is the motion layer: Lenis smooth scroll, GSAP/ScrollTrigger reveals, react-bits-style vanilla effects (spotlight cards, magnetic buttons, shiny text), and a lazy Vanta NET backdrop on the pilot section. It no-ops under `prefers-reduced-motion` or if the vendored libs fail to load
- `en/ ja/ es/ fr/ de/ it/ pt/` — generated per-language pages; never hand-edit. After changing `index.html` or `i18n.js`, run `node scripts/build-locales.mjs` (also rewrites hreflang, `sitemap.xml`, `sitemap.txt`; CI runs `--check`)
- `vendor/` — vendored third-party libs (three, gsap + ScrollTrigger, lenis, vanta.net); no CDN dependency
- `llms.txt`, `sitemap.xml`, `sitemap.txt`, `robots.txt` — SEO/AEO/GEO: machine-readable product summary and crawl configuration

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Drawing automation | AutoCAD 2021 plugin, .NET, Avalonia (cross-platform desktop) |
| Product page | Vanilla HTML/CSS/JS, Three.js, GSAP + ScrollTrigger, Lenis, Vanta |

## Key Domain Concepts

- **結構施工圖數位化**: The structural drawing is the single source of truth — parsed once into bar-schedule/cut-list/bend-list data that drives every downstream step (shop drawings, 3D check, machine output)
- **取代外包算量 (replace outsourced takeoff)**: Current product axis (strategy of 30 Oct 2026). Drawing in, bar schedule (.xlsm) and annotated shop drawings (.dwg/DXF) out; every value tagged read/computed/converted/default and every gap flagged for review. Shipping for beams, columns, slabs and walls; drawing prep, foundations, bend types and 3D check are in development; BVBS is only planned. AR field guidance and photo-based as-built verification are dropped from the roadmap, so do not reintroduce them on the page
- **Market figures**: Stats on the page (16,900 US estimator openings, +24%/+4% bids vs headcount, 24–72 h and US$100–500 competitor turnaround/price, 9 Mt US rebar, US$37/h) come from third-party or vendor sources and are footnoted as such; the hours/dollars example is an illustration, not a measured result. Do not publish pricing
- **稽核鏈 (audit trail)**: SHA-256 hash-chained, append-only, timestamped record of pipeline actions, built for government/enterprise compliance review
- Current focus: rebar takeoff for fabricators and detailers in the US and Europe, with Taiwan (CNS drawings) as the proving ground. Roadmap targets adjacent trades: CNC machining, mold making, welding, auto repair, plumbing, sheet metal

## Language

The product page and `README.md` are in Traditional Chinese / English (繁體中文 primary, 8 languages total). The legacy PDF business deck is Traditional Chinese, written for the original craft-skill-training pitch — do not treat it as authoritative for the current product.
