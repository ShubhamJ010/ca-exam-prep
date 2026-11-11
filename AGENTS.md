# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before editing anything.

## What this project is

A static, single-screen study quiz for Philippine Criminal Justice / Correctional Administration (CA 1), generated from handwritten review notes. The whole product is: one question card, four options, a tier badge, two progress-dot counters, and a skip link. It opens directly into question one.

Live: https://shubhamj010.github.io/ca-exam-prep/
Stack: Bun + Vite (vanilla TypeScript) + Tailwind CSS v4 + js-confetti. No framework, no router, no backend, no auth, no persistence.

## Non-negotiable constraints

- Do **not** add React, Vue, Svelte, Preact, Redux, or any external UI/component/state library.
- Do **not** add routing, landing pages, menus, settings panels, login screens, or modals. The app loads straight into a question.
- Do **not** add a backend, database, analytics, or network calls.
- Do **not** change the progression math in `src/engine.ts` unless the user explicitly asks for a rules change. The rules below are the product.
- Do **not** introduce multi-second transitions or animations that gate the next question. The only intentional delay is the 650ms answer reveal on a miss (`REVEAL_MS` in `src/main.ts`), and clicking still advances immediately after.
- Keep the app functional without JavaScript-driven routing and keep `base: './'` in `vite.config.ts` — Pages serves from a subpath.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/engine.ts` | Pure reducer. `createState()`, `applyAnswer(state, correct)`. No DOM, no randomness, no time. Must stay testable in Node/Bun. |
| `src/main.ts` | Shuffle bags, drawing, DOM rendering, keyboard input, confetti, the reveal timer. |
| `src/questions.json` | The question bank. Flat array, schema below. |
| `src/styles.css` | Tailwind entry, `@theme` design tokens, neo-brutalist component classes (`.nb`, `.nb-badge`, `.nb-option`, `.dot`, `.nb-skip`). |
| `index.html` | Static HUD/card/footer markup with the element ids `tierBadge`, `dotsLabel`, `dots`, `hardDots`, `score`, `questionLabel`, `questionTier`, `questionText`, `options`, `feedback`, `skip`. |
| `.github/workflows/deploy.yml` | Build on every push/PR, deploy `dist/` to Pages on `main`. |

`main.ts` sets `state.tier = state.nextTier` after each answer, then draws from that tier's bag. Rendering is a full re-render of the card per question — there is no virtual DOM and no diffing.

### Progression rules (authoritative)

State: `easyStreak` (target 3), `hardCharge` (target 2), `mediumStrikes` (max 2), `mediumLocked`, `redemptionStreak` (target 4).

**Easy**
- Correct, medium unlocked: `easyStreak++`; at 3 queue one medium, reset streak to 0. Otherwise serve easy.
- Correct, medium locked: `redemptionStreak++`; at 4 unlock medium, clear strikes and redemption. Serve easy.
- Miss/skip: `easyStreak = 0`, `redemptionStreak = 0`. Serve easy.

**Medium**
- Correct: `hardCharge++`; at 2 queue one hard and clear the charge, otherwise serve easy (charge persists and stays visible in the HUD).
- Miss/skip: `mediumStrikes++`, `hardCharge = 0`; at 2 strikes set `mediumLocked`, reset redemption, serve easy. Below 2, serve easy.

**Hard**
- Single question. Correct or not: `hardCharge = 0`, serve easy.

A miss and a skip are the same transition. A question is never removed for being answered wrong — it is only avoided within a bag until that bag reshuffles.

The HUD shows 3 easy dots, or 4 redemption dots while locked, plus 2 hard-charge dots. Do not hide the hard charge when the rotation is on easy; it persists by design.

## Adding or editing questions

All content is in `src/questions.json`. Never generate questions that are not supported by the source notes; if the notes are ambiguous, leave the fact out or state it exactly as written.

Schema (every object):

```json
{
  "id": "m_059",
  "difficulty": "medium",
  "question": "How many times a day must BUCOR conduct an inmate head count?",
  "options": ["Two (2) times", "Four (4) times", "Five to six (5–6) times", "Eight (8) times"],
  "answer": 1,
  "explanation": "BUCOR conducts head count four times a day; BJMP conducts five to six."
}
```

Validation rules:

1. `id` is unique and prefixed by difficulty (`e_`, `m_`, `h_`) with a zero-padded sequence; continue that bucket's numbering.
2. `difficulty` is exactly `easy`, `medium`, or `hard`, and all three buckets stay populated.
3. `options` has exactly 4 unique, trimmed strings. Avoid leading/trailing spaces and avoid distractors that are absurd on their face.
4. `answer` is an integer 0–3.
5. `explanation` is optional in the app but expected when authoring; the UI does not render it yet.

Difficulty rubric used to split the bank (166 items: 75 easy / 58 medium / 33 hard):

- **easy** — definitions, agency names, "also known as", single-fact recall.
- **medium** — numbers, durations, dates, sentence ranges, two-way comparisons.
- **hard** — "new vs old rule" distinctions, ratios, multi-clause answers, table lookups, near-identical options.

When adding a batch, keep the balance roughly in the existing ratio so the ramp still works. A hard question that is trivially guessable or an easy question that needs three facts defeats the tiering.

## Checks before finishing

Run at minimum:

```bash
bun run build
```

That runs `tsc` (typecheck, `noEmit`) and the Vite production build. If you changed `src/engine.ts`, verify the transitions with a throwaway script rather than by clicking:

```ts
import { applyAnswer, createState, type Tier } from './src/engine';
const start = (tier: Tier) => ({ ...createState(), tier, nextTier: tier });
// 3 easy corrects -> 'medium'; 2 medium corrects -> 'hard'; 2 medium misses -> mediumLocked;
// hard always -> 'easy' with hardCharge 0; 4 redemption corrects unlock medium.
```

If you changed `src/questions.json`, verify the schema with:

```bash
node -e "const q=require('./src/questions.json');const ids=new Set();const c={};for(const x of q){if(ids.has(x.id))throw Error('dup '+x.id);ids.add(x.id);if(!['easy','medium','hard'].includes(x.difficulty))throw Error('tier '+x.id);if(x.options.length!==4||new Set(x.options).size!==4)throw Error('opts '+x.id);if(!Number.isInteger(x.answer)||x.answer<0||x.answer>3)throw Error('answer '+x.id);c[x.difficulty]=(c[x.difficulty]||0)+1;}console.log(q.length,c)"
```

Then load the dev server and answer a few questions to confirm the card renders and the tier badge moves.

## Deployment

Push to `main`. The workflow installs with `bun install --frozen-lockfile`, builds, uploads `dist/` and deploys to Pages. Do not commit `dist/` or `node_modules/` (both ignored). Pages must keep `build_type: workflow`; changing it to a branch source breaks the deploy job.
