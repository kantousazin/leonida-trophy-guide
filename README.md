# leonida-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/kantousazin/leonida-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/kantousazin/leonida-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Trophy Guide** is a complete, fully offline trophy guide and platinum tracker for Grand Theft Auto VI (PlayStation 5), covering all 55 official trophies. It was built for the make.fun bounty `gta6-trophy-guide-01`.

## What the finished app does

- **Checklist & tracker** — all 55 trophies with checkboxes; progress is saved in your browser (localStorage), with an overall progress ring and per-grade counters (platinum / gold / silver / bronze), plus per-type progress chips that double as filters.
- **Filters & search** — filter by grade, by trophy type (story, side, activity, combat, collectible, stunt, exploration, economy, completion, platinum — each classification carries its reasoning in the data), and by earned status; full-text search across names, descriptions and guides.
- **Spoiler protection** — on by default: secret trophies and unearned story/side trophies are blurred in the list and pane until you earn them or explicitly reveal them.
- **A guide for every trophy** — click any trophy for its full guide in our own words: what to do, how the classification was derived, a missable check, and its sources. No invented locations or steps: where the official description does not pin something down, the guide says so.
- **Roadmap to Platinum** — a five-phase route (arrival → story campaign → strangers & strands → Leonida in full → money, completion & platinum) built only from the official descriptions, with live per-phase progress and trophy chips that jump back into the checklist. Every trophy's detail pane names its roadmap phase.
- **Missables** — an honesty-first page: the game was unreleased when this guide was written, so instead of fake certainty it flags the four trophies whose official wording reads as a one-time risk (opening mission, a VCIA departure, an Ocean Beach moment, a second-attempt reward), explains the reasoning, and gives save habits that cover them.
- **Next Up planner** — ranked suggestions computed from your own tracker state: story first, then quick single-action trophies, strand finales, activities, cumulative counters, and the platinum only when it is the last one standing.
- **Export / import** — progress exports as validated JSON and imports back (starter-format plain arrays are also accepted; unknown entries are reported, not silently kept).

## Data honesty

Trophy names, descriptions and grades in `app/data/trophies.json` are the official list exactly as published (via Exophase and PSNProfiles, list dated 2026-11-18) and are never altered. Everything else — guide texts, type classifications, missable-risk reasoning — is original writing for this guide, derived from those descriptions and cited per trophy in the app itself.

## Run it

```sh
node --experimental-strip-types main.ts   # builds /output + dossier.json (MAKEFUN_OUTPUT_DIR overrides the target)
node serve.ts                              # local dev server for app/ on http://localhost:8080
# or serve the app directly:
python3 -m http.server --directory app 8000
```

The app is plain static files (`app/index.html`, `app/app.js`, `app/style.css`, `app/data/trophies.json`) with no build step and no network access — it loads nothing external. Screenshots in `screenshots/` (defined in `shots.json`) show the checklist, roadmap, missables and Next Up views with a seeded 13/55 playthrough.

---

<sub>Entered on [make.fun](https://make.fun/?ref=et3tdj7w&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
