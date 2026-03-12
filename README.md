# ReliefSignal

ReliefSignal is a local-first disaster relief coordination workspace built for the Airia AI Agents Hackathon. It turns field updates, volunteer notes, and needs assessments into a live response queue, coordination brief, operational checklist, outreach plan, and 72-hour board without requiring a backend.

## Why ReliefSignal

Disaster response teams still lose time stitching together raw updates from field teams, community partners, and volunteers. ReliefSignal keeps that information in one place and turns it into a working operational picture fast enough to matter during the first response window.

## What the product does

- Converts rough intake notes into structured response signals.
- Scores urgency, impact, and effort to rank the next actions.
- Tracks work from incoming through verified, mobilizing, and resolved.
- Generates a clear response brief for coordinators and partner leads.
- Persists locally and works offline after the shell is cached.

## Product flow

1. Paste incoming field notes, volunteer updates, or needs assessments.
2. Build a prioritized response queue.
3. Review the board, 72-hour timeline, and spotlight actions.
4. Copy or download the response brief for the next handoff.

## Stack

- `app/`: source for the product experience
- `app/src/`: scoring, state, storage, export, and demo data
- `tests/`: unit coverage for response planning and exported briefs
- `scripts/`: local serve, build, verify, and demo video tooling
- `docs/`: deployable static output

## Run locally

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:3000`.

## Validate

```bash
npm test
npm run build
npm run verify
```

## Deploy

ReliefSignal ships as a local-first static site. `npm run build` refreshes `docs/`, and that output can be hosted on GitHub Pages, Netlify, Vercel, or any static CDN.
