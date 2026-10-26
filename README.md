# SuspensionLab

An interactive, educational **suspension engineering sandbox**. Drag sliders for spring rates,
dampers, anti-roll bars, geometry, and wheel fitment — and watch a real 2-DOF quarter-car model,
load-transfer math, and roll/pitch dynamics respond live: animated schematics, engineering stats,
response plots, and a plain-English explanation of what your setup actually does.

Built for two audiences at once:

- **Curious novices & amateur race engineers** — every stat has a physics tooltip, guided lessons
  walk from "what is a spring rate?" to building a full track setup, and the balance/comfort/sport
  indices make cause-and-effect legible.
- **The fitment & stance community** — a dedicated *Wheels & Fitment* group (wheel size, offset,
  tire spec, stretch) drives poke/tuck, fender-gap, rub-risk, scrub and speedo-error stats, plus a
  *Static Show / Stance* preset and a stance lesson. Slam it, stretch it, camber it — and see
  exactly what it costs.

## Features

- **Live physics** — pure-TypeScript vehicle dynamics (no physics library): ride frequencies,
  damping ratios vs critical, wheel rates through motion ratio, roll stiffness (springs + ARBs),
  roll/pitch gradients, three-path lateral load transfer, corner loads with wheel-lift detection,
  wheel-hop frequencies, transmissibility, and heuristic comfort/sport/balance indices — all
  unit-tested with Vitest.
- **Animated schematics** — front/side full-car views (roll, pitch, heave, fitment) and a
  quarter-car rig driven by the *same RK4 integrator* as the charts. Underdamped setups visibly
  ring; overdamped ones creep. That's the lesson.
- **Response charts** — step response, transmissibility (log-frequency), and a top-down corner-load
  view with wheel-lift warnings.
- **AI race engineer** — after you stop adjusting (~0.9 s), the app asks the **local Claude Code
  CLI** to explain your setup in plain English (see below). Full prompt transparency via the
  Prompt Inspector. If Claude Code isn't installed, a rule-based offline explainer takes over —
  the app never blocks on AI.
- **Compare mode** — pin Snapshot A, keep tuning; every stat shows a delta chip and charts overlay
  A (dashed) vs B (live).
- **Guided lessons** — 7 interactive lessons with live checkpoints (progress persists).
- **7 presets** — Comfort Sedan, Sports Coupe, Track Day, Off-Road, Drift, F1-ish Downforce,
  Static Show/Stance.
- SI ⇄ Imperial toggle (lossless round-trip), dark/light themes, save/load/rename/export/import
  configs, keyboard-operable everything, `prefers-reduced-motion` respected.

## Run it

```bash
npm install

# development (Vite on :5173 with proxy + API server on :8787)
npm run dev

# production (build then serve everything from the API server)
npm run build
npm start           # http://<host>:8787 — binds 0.0.0.0, so LAN/tailnet reachable
```

Tests / lint:

```bash
npm test            # Vitest: physics, conversions, prompt builder
npm run lint
```

## How the Claude Code hook works

There is **no hosted API key anywhere**. The Express server exposes `POST /api/summary`, which:

1. Validates the request (zod) — the payload is only typed numbers and enums from the app,
   so there's no user-controlled text to inject.
2. Builds a deterministic prompt (`server/src/claude/promptBuilder.ts`) describing your params +
   derived stats in your chosen units, with focus-specific instructions (Overview / Handling /
   Comfort / Tradeoffs / Stance).
3. Spawns your **local Claude Code CLI** in non-interactive print mode —
   `claude -p "<prompt>"` — with a 60 s timeout (`CLAUDE_TIMEOUT_MS` to change; real CLI
   latency is 15–40 s) and a 2-process concurrency cap, using your machine's existing Claude
   subscription/login. stdout becomes the summary.
4. Caches the result in `server/data/summary-cache.json`, keyed by a stable hash of the inputs,
   so identical setups never re-invoke the CLI. Identical concurrent requests share one invocation.

Failure modes are typed and graceful: CLI missing → `CLAUDE_NOT_FOUND` (client shows the offline
rule-based summary + an enable hint), hang → `TIMEOUT` with the child killed, other CLI
errors → `CLAUDE_ERROR`. The UI never spins forever.

## Architecture notes

- `src/physics/` is 100% framework-free and pure — `derive(params)` returns every stat; the rAF
  animations reuse `quarterCarModel` + `stepRK4` so the visuals and the plots can never disagree.
- State: one Zustand config store (params + derived + snapshot + prefs). Numeric stats recompute
  synchronously on every change; chart series recompute on a ~66 ms trailing throttle so slider
  scrubbing stays at 60 fps.
- Units: state is always SI; conversion only at the display/input boundary (`src/units/convert.ts`),
  so SI ⇄ Imperial round-trips exactly.
- `shared/contract.ts` is the single source of truth for the client↔server API.

## Fitment model, honestly

Tape-measure math (tire diameter, sidewall, poke from width/offset vs a 17×7 ET45 reference,
stretch factor, speedo error, scrub delta) is exact. The **fender gap** is a schematic model —
70 mm reference gap at 140 mm ride height, moving 1:1 with ride height and tire radius — and the
rub-risk heuristic combines gap, poke, and camber tuck. It teaches the right relationships; it
won't replace test-fitting your actual arches.
