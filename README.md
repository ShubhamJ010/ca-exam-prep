# CA Exam Prep

A single-screen study quiz for Philippine **Criminal Justice / Correctional Administration (CA 1)**, built from handwritten review notes. 166 questions, no login, no backend — the page opens straight into question one.

- **Live:** https://shubhamj010.github.io/ca-exam-prep/
- **Repo:** https://github.com/ShubhamJ010/ca-exam-prep

## The idea

Reviewing a 90,000-character notes dump is passive. This turns it into an active recall loop with a difficulty ramp: you earn your way into harder questions by answering easier ones correctly, and you lose the right to medium questions if you keep missing them.

The point is not to grind through a fixed list. It is to keep you on the edge of what you know — easy questions to build momentum, medium questions as the reward, and a single hard question as the boss you occasionally get to face.

## How it works (gameplay)

Three difficulty buckets are each shuffled into a **bag**. Questions are drawn with `.pop()`, and a bag only reshuffles once it is empty — so every question in a tier is seen before any of them repeats.

You start in the **easy** rotation. Every answer moves you somewhere:

| Tier | How you get there | Correct answer | Miss or skip |
| --- | --- | --- | --- |
| **Easy** | Default rotation | Streak +1. Three in a row queues one **medium** question. | Streak resets to 0, and the redemption streak resets too. |
| **Medium** | Earned with 3 easy corrects | Hard charge +1. The **second** medium correct queues one **hard** question; the first returns you to easy with the charge kept. | Strikes +1 and the hard charge clears. Two strikes **lock** medium. |
| **Hard** | Earned with 2 medium corrects | Single question, sudden death. Correct or not, you go back to easy with the charge cleared. | Same — back to easy, charge cleared. |

A single run looks like this:

```
easy ✓ ✓ ✓        -> one medium question
medium ✓          -> back to easy, hard charge 1/2
easy ✓ ✓ ✓        -> one medium question
medium ✓          -> HARD boss question 🎀
hard ✓ or ✗       -> back to easy, charge cleared
```

If medium is **locked**, the streak dots become a redemption counter: four correct easy answers in a row reopen medium and wipe the strikes. One miss anywhere in that run resets redemption to zero, so the ramp has to be earned again.

The HUD tells you where you are at a glance:

| Element | Meaning |
| --- | --- |
| **Tier badge** | The tier of the question on screen: EASY, MEDIUM, HARD, or LOCKED when medium has been revoked. |
| **Easy streak (3 dots)** | Progress toward your next medium question. While locked, this becomes 4 redemption dots. |
| **Hard charge (2 dots)** | Each medium correct fills one. Filling both unleashes the hard question. |
| **Correct** | How many questions you have answered correctly this session. |

## Usage

1. Open https://shubhamj010.github.io/ca-exam-prep/ — question one is already on screen. There is no start screen, menu or login.
2. Read the question and pick one of the four options: click or tap it, or press `1`, `2`, `3`, `4` on a keyboard.
3. A correct answer fires tier-appropriate confetti and loads the next question immediately. A wrong answer highlights the correct option in pink and rose for 650ms, then continues.
4. Use **Skip question →** if you do not know it. Skipping counts exactly like a miss: it breaks your streak and adds a strike when you are in a medium question.
5. Watch the badge and dots to see what is coming — three filled easy dots mean a medium question is next, and the second filled hard-charge dot means the hard question is armed.
6. Refresh the page to reshuffle every bucket and start over. Progress is intentionally not saved: there is no account, storage or backend.

The layout is a single viewport on purpose — question, four options, skip link, no scrolling required on a laptop or phone.

## Stack

- **Bun + Vite** (vanilla TypeScript, no framework, no router)
- **Tailwind CSS v4** via `@tailwindcss/vite`, with the neo-brutalist Hello Kitty tokens in `src/styles.css`
- **js-confetti** for the canvas particles
- **GitHub Actions → GitHub Pages** for CI and hosting

## Local development

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # tsc typecheck + vite build -> dist/
bun run preview  # serve the production build
```

## Project structure

```
index.html                 HUD, question card, skip footer markup
src/main.ts                shuffle bags, rendering, confetti, input
src/engine.ts              pure progression reducer (no DOM)
src/questions.json         the question bank
src/styles.css             Tailwind entry + neo-brutalist component classes
.github/workflows/deploy.yml  CI build on PRs, Pages deploy on main
```

`src/engine.ts` has no DOM or randomness in it, so the progression rules can be tested in isolation without a browser.

## Adding questions (for humans)

All questions live in `src/questions.json`. Open it, add an object to the end of the array, and pick a bucket:

```json
{
  "id": "e_076",
  "difficulty": "easy",
  "question": "Which agency supervises the national penitentiaries?",
  "options": [
    "Department of Justice",
    "Department of the Interior and Local Government",
    "Department of Social Welfare and Development",
    "Department of National Defense"
  ],
  "answer": 0,
  "explanation": "The DOJ supervises national penitentiaries through the Bureau of Corrections."
}
```

Rules the app relies on:

1. **`id`** — unique, prefixed by difficulty: `e_` easy, `m_` medium, `h_` hard, then a zero-padded sequence number. Continue the existing numbering in that bucket (`e_076` after `e_075`) rather than reusing gaps; order inside the file does not matter because every bucket is shuffled.
2. **`difficulty`** — exactly `easy`, `medium`, or `hard`. All three buckets must stay non-empty or the app has nothing to draw.
3. **`options`** — exactly four unique strings. Keep them similar in length and grammatical shape so the answer is not obvious from formatting.
4. **`answer`** — the 0-based index of the correct option (`0` = A, `1` = B, `2` = C, `3` = D).
5. **`explanation`** — optional but please include it; it is stored for future review features even though the current UI does not display it.

Difficulty guidance used to build the existing bank: definitions, agencies and single-fact recall are **easy**; numbers, durations, dates, and two-way comparisons are **medium**; "new vs old rule" details, multi-clause answers, ratios, table lookups and fine distinctions are **hard**.

After editing, check it:

```bash
bun run build
```

Then commit and push to `main` — the workflow rebuilds and republishes Pages automatically.

## Deployment

Pages is configured with **build type = workflow**. `.github/workflows/deploy.yml` runs on every push and pull request (build only), and on `main` it uploads `dist/` as the Pages artifact and deploys it. `vite.config.ts` sets `base: './'` so the bundle works from the `/ca-exam-prep/` project path.

## For AI agents

See [AGENTS.md](./AGENTS.md) — it lists the architectural invariants, the exact progression math, and the checklist for adding questions.
