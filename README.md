# SetTime

**Rebar takeoff that replaces the outsourced estimating team — structural drawing in, bar schedule and shop drawings out**

SetTime reads the structural drawing and writes the bar schedule and
annotated shop drawings that a fabricator needs, so a fabricator, detailer
or contractor no longer has to buy the takeoff from an outsourced team.
Every value is tagged as read from the drawing, computed, converted or
defaulted, and every gap is flagged for a person to review.

Built by [Kairos.ai](https://www.kairosaitech.com). Target customers:
rebar fabricators and detailing firms in the US and Europe that buy
outsourced takeoff today. The engine is being validated on Taiwanese (CNS) drawings.

---

## The Pipeline

```
1. Drawing prep           sort sheets, scale, legends/tables, tag members        (in development)
        │
        ▼
2. Takeoff + bar schedule count bars by member and floor → .xlsm schedule         (shipping: beams, columns, slabs, walls)
        │
        ▼
3. Shop drawings          bar marks and notes on the drawing → .dwg / DXF         (shipping: beams, columns, slabs, walls)
        │
        ▼
4. 3D check               cover, lap, anchorage, clashes, quantity cross-check    (in development)
        │
        ▼
5. Machine output         BVBS files for bending machines                         (in development)
```

## Shipping Today

An AutoCAD 2021 plugin plus a cross-platform desktop app (Avalonia) that
converts beam, column, slab and wall drawings into a bar schedule (`.xlsm`) and
annotated shop drawings (`.dwg` / DXF), importing natively into a
fabricator's existing macro tooling. A tunable Style Guide rules engine
adapts the takeoff to firm-specific drafting conventions, and a source trace
marks each value as read, computed, converted or defaulted.

## In Development

- **Drawing preparation and annotation** — sheet sorting, scale, legend and
  table reading, member tagging.
- **Foundations**, plus bend angles and hook types.
- **3D model check** — a 3D bar model built from the schedule that checks
  cover, lap, anchorage and clashes and reconciles its quantities against
  the takeoff.
- **BVBS output** for bending machines.
- **Tamper-evident audit trail** — every action is written to a SHA-256
  hash-chained, append-only, UTC-timestamped record, built for large
  contractor groups and public-tender audit review. It detects tampering
  after the fact (tamper-*evident*); it is not a certification of compliance
  with any specific law, regulation, or tender requirement.

Not on the current roadmap: AR field guidance and photo-based as-built
verification.

## Who It's For

Rebar fabricators, detailing firms, contractors and estimators who buy
outsourced takeoff today, starting with the US and Europe.

## Why Not the Alternatives

| Current method | Upside | Gap | SetTime |
|---|---|---|---|
| Offshore outsourced takeoff | Low per-tonne rate | Days to deliver; checking depends on people | One drawing back in 24 hours, every flag listed |
| AI takeoff with human QA | Fast first draft | Quantities first; bar schedule and shop drawings not listed | Takeoff, bar schedule and shop drawings in one run |
| CAD add-ons run by an operator | Familiar to local detailers | Needs a CAD seat and a trained operator | Upload a drawing, review the flags |
| 3D BIM detailing suites | Deep detailing, machine formats | Needs a 3D model first | Starts from the 2D drawing you already have |

## What Sets It Apart

- **Every number traceable** — values are tagged by source and gaps flagged.
- **Rules you can adjust** — a Style Guide rule engine fits your drawing
  conventions and code.
- **Machine-ready output** — schedule and shop drawings the fabricator can
  use; BVBS machine files are in development.
- **Fabricator/contractor network** — plugs into the existing fabricator and
  contractor supply chain.

## Market Figures on the Page

The figures on the landing page (US estimator openings, bid-volume growth,
turnaround and price of competing services, US rebar tonnage) come from
third-party and vendor publications, not from this product. The
time-saving example is an illustration with its assumptions stated on the
page, and the weight-accuracy target is a target, not a measured result.

## Roadmap

Rebar/structural construction is the current focus. The underlying
drawing-to-schedule approach is built to extend into adjacent trades:
CNC machining, mold making, welding, auto repair, plumbing, and sheet
metal.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Takeoff and drawing automation | AutoCAD 2021 plugin, .NET, Avalonia (cross-platform desktop) |
| Web / product page | Vanilla HTML/CSS/JS, Three.js (rebar-cage backdrop, page-wide) |
| Audit trail | SHA-256 hash chaining, append-only JSONL storage |

## Repository Contents

- `index.html`, `styles.css`, `script.js`, `hero3d.js`, `i18n.js` — the
  product landing page: static HTML/CSS with a Three.js rebar-cage backdrop
  (scroll-scrubbed flythrough during the hero, then a fixed translucent
  background behind every section) and client-side i18n (8 languages:
  繁體中文, English, 日本語, Español, Français, Deutsch, Italiano, Português).
- `llms.txt` — a machine-readable summary of the product for AI answer
  engines (AEO/GEO).
- `en/`, `ja/`, `es/`, `fr/`, `de/`, `it/`, `pt/` — generated per-language pages (hreflang targets). Do not edit by hand: change `index.html` or `i18n.js`, then run `node scripts/build-locales.mjs`; CI runs it with `--check`. The same script keeps the hreflang block, `sitemap.xml` and `sitemap.txt` in sync.
- `scripts/og-card.html` — source for `assets/settime-og-card.jpg` (screenshot at 1200×630).
- `sitemap.xml`, `sitemap.txt`, `robots.txt` — standard SEO crawl configuration, with
  explicit allow-rules for AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
  etc.).

## Team

Team members graduated from National Tsing Hua University with expertise
spanning Computer Science, Law, and Economics, with end-to-end experience
building AI systems from 0 to 1.

**Competition Results:**
- Legal Tech Hackathon 2022 — Compliance Special Award (Team Lead)
- ITRI AI Data Science Talent Program — Final Presentation Competition 3rd
  Place (Team Lead + LSTM Model)

**Industry Experience:**
- Semiconductor wafer process AI optimization
- Solar panel AIoT system deployment
- Startup software company 0-to-1 development

## Contact Us

We welcome contractors, fabricators, structural engineers, developers,
government agencies, and investors interested in SetTime to get in touch.

- Free pilot program: apply via the [product page](https://settime.kairosaitech.com/#pilot)
  with name, company, email, country, and role. Send one structural drawing and get the material list back within 24 hours of receiving it.
- Email: kairos.ai.tech@gmail.com
- Website: [Kairos.ai](https://www.kairosaitech.com)
