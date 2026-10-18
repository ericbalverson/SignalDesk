# Signal Desk · Layer 9

An idle tycoon game from Layer 9 for training customer service reps (CSRs) at wireless and fiber ISPs.

You run the support desk at a growing ISP. Subscribers pay you every second. You spend that money on new towers or fiber areas, marketing, staff and tools. Calls come into a queue:

- **Routine calls** close with one click.
- **Coaching calls** are the training. Each one shows what the customer says plus account and network data (signal in dBm, SNR, optical light levels, sector load, equipment status). The trainee picks one of four actions and sees why it was best practice, partly right or wrong.
- **Multi-step calls** play out over two to four steps. After each choice, the call moves on to what the customer says or what the CSR finds next.

Good answers raise customer satisfaction (CSAT), which grows the subscriber base. Poor answers and callers left waiting push CSAT down, and customers start leaving.

## Play

Open `index.html` in a browser. No build step and no server needed.

To host it for a team, turn on GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch, root folder).

## Truck rolls

Any answer that books, schedules or sends a technician is a truck roll. A wireframe truck drives across the screen, a −$300 splash pops up, and $300 comes out of cash, even if that takes it below zero. This happens whether or not sending a tech was the right call, the same way a real visit costs money either way. The call result shows the charge.

Truck rolls are detected from the answer's wording. To set one explicitly, add `truck: true` or `truck: false` to an option in a scenario file or imported JSON. The cost is `TRUCK_COST` in `game.js`.

## Glossary

Technical terms in a call (RSSI, SNR, ONT, PoE injector, CGNAT and others, 46 in all) are marked with a small **?**. Clicking one, or pressing Enter on it, opens an info screen and pauses the game. The screen covers:

- what the term means
- good and bad readings, where they apply (for example RSSI in dBm or fiber light levels), using the operator's signal levels from Setup
- why it matters to the customer and to satisfaction
- how to explain it to a customer on a call

Closing the screen resumes the game, unless it was already paused. Each term is marked once per call. Glossary entries also show up in **Reference** search.

Terms live in [`glossary.js`](glossary.js). Each entry has the words to match (`match`), optional exact-case matching for acronyms (`cs`), an optional network (`net`) for terms that differ between wireless and fiber (LOS means line of sight on wireless and loss of signal on fiber), and the text fields `what`, `ranges`, `csat` and `say`. The ranges are rules of thumb, so adjust them to your equipment.

## Operator setup

The first time the game opens, the operator sees a setup screen. It opens again from the **Setup** button at the top. Choose:

- **Network**: wireless only, a blend, or fiber only.
- **Signal levels**: open this section to set the cutoffs your network uses for six readings: wireless signal (RSSI), signal-to-noise (SNR), fiber light level (Rx), latency, retransmits and sector peak load. Each reading has bands like Strong, Fair, Weak and Unreliable. Readings in the account panel are colored green, orange or red by these cutoffs, and the glossary shows the operator's ranges. Each cutoff must be worse than the one before it, and **Reset to standard** restores the defaults. The defaults live in `SIGNAL_DESK_LEVELS` at the bottom of `glossary.js`. Changing cutoffs doesn't change which answer a scenario counts as best.
- **Training content**:
  - **Built-in calls only**.
  - **Add our FAQ**: upload or paste an FAQ as text, Markdown, CSV (question and answer columns), a saved web page, or JSON. Signal Desk finds the question-and-answer pairs and pre-selects the ones relevant to CSRs (billing, plans, installation, service, account, support). Careers, press and similar entries are left unchecked. You can change the selection before adding.
  - **Use our website**: enter your site's address. Most websites block other pages from reading them, so you'll usually use one of two fallbacks:
    - **Run the included scraper**: `python tools/scrape_site.py https://www.your-isp.com`. It needs Python 3.8 or later and nothing else. It reads up to 40 pages a CSR would use, skips careers, press and blog pages, follows robots.txt, pauses between requests, and saves `site-content.json`. Upload that file in Setup. Only scrape sites you own or have permission to use.
    - **Ask Claude to read the site**: copy the prompt from Setup, paste it into Claude, and paste or upload the JSON it returns.

Each selected FAQ question becomes a **knowledge call**: a customer asks the question and the trainee picks your company's answer from four. The wrong choices are answers to your other FAQ questions. A slider in **Library & progress** sets how many coaching calls are knowledge calls (30% by default). Knowledge calls need at least 4 questions. FAQ answers and website text can also be searched during any call with the **Reference** button, and they're included when building scenario prompts from call logs.

## Training controls

- **Network mix**: a slider from wireless only to fiber only, with a Blend preset. It sets the share of wireless and fiber coaching calls. Billing, security and other network-neutral calls appear in both.
- **Call pace**: speeds calls up or slows them down, from 0.25× to 3×.
- **Pause**: stops the clock, the queue and income. You can also press `P`.
- **Hold the queue while I'm on a coaching call**: freezes the queue while the trainee reads a call, so they aren't rushed.

## What it trains

44 built-in calls (5 of them multi-step) across connectivity, speed, signal and line of sight, optical and outside plant, outages, safety, billing, sales, equipment, network, security and escalation.

Each call has three different customer openings and a randomly chosen caller name, and the answer order is shuffled. That way trainees learn the problem, not the wording. New calls lean toward ones the trainee hasn't seen and topics they keep missing. The **Training record** shows accuracy for each topic and for wireless and fiber separately, and lists lessons to review until the trainee gets that call fully right.

## Your library

Open **Library & progress** at the bottom of the page.

1. **Company knowledge**: the FAQ questions and website text added in Setup, grouped by source. Remove a source, change the share of knowledge calls, or add more.
2. **Policies**: upload text, Markdown or CSV files, or paste text. During a call, trainees can search them with the **Reference** button. Policies are saved in the browser.
3. **Call logs to scenarios**: upload call logs, then select **Build prompt for Claude**. This builds one prompt with your policies, company knowledge, your logs and the scenario format. Paste it into Claude, and Claude writes scenarios based on your real calls. Logs stay in the open tab and are never sent anywhere by the page. Remove customer names, addresses and account numbers before sharing logs with any AI tool.
4. **Import scenarios**: paste the JSON Claude returns, or import a `.json` file. Invalid entries are skipped with a reason. You can train on your scenarios alone, export them to share with other trainers, or remove them.
5. **Trainee progress**: progress saves automatically in the browser. **Save progress file** downloads a `.json` file with the trainee's name. **Load progress file** restores it on any computer. A trainer can collect these files to review progress.

## Writing scenarios by hand

Built-in scenarios live in [`scenarios/`](scenarios): `wireless.js`, `fiber.js`, `shared.js` (any network) and `multistep.js`. Imported scenarios use the same format as JSON.

| Field | Meaning |
| --- | --- |
| `id` | Unique short name |
| `net` | `"wireless"`, `"fiber"` or `"any"` |
| `topic` | Topic shown in the training record. A new topic name adds a new row. |
| `plan` | Customer's service plan (optional) |
| `caller` | Fixed caller name (optional; a random name is used otherwise) |
| `quotes` | Different ways a customer might open the call. One is picked at random. |
| `data` | `[label, value]` rows shown in the account and network panel |
| `options` | Single-step calls: the choices. `s: 2` is best practice, `s: 1` is acceptable but incomplete, `s: 0` is wrong. `why` explains the rating. Optional `truck: true` or `false` marks a truck roll. |
| `steps` | Multi-step calls, instead of `options`: a list of steps. Each has `options`, plus optional `say` (what the customer says or what the CSR finds) and `data` (new rows). |
| `lesson` | One-line takeaway shown at the end of the call |

Keep the four options similar in length so the best answer doesn't stand out by being the longest.

Built-in scenarios describe general support practice. Credits, verification steps and escalation paths vary by company, so adapt them to your own policies.
