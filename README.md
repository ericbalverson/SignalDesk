# Signal Desk

An idle tycoon game for training customer service reps (CSRs) at wireless and fiber ISPs.

You run the support desk at a growing ISP. Subscribers pay you every second. You spend that money on new towers or fiber areas, marketing, staff and tools. Calls come into a queue:

- **Routine calls** close with one click.
- **Coaching calls** are the training. Each one shows what the customer says plus account and network data (signal in dBm, SNR, optical light levels, sector load, equipment status). The trainee picks one of four actions and sees why it was best practice, partly right or wrong.
- **Multi-step calls** play out over two to four steps. After each choice, the call moves on to what the customer says or what the CSR finds next.

Good answers raise customer satisfaction (CSAT), which grows the subscriber base. Poor answers and callers left waiting push CSAT down, and customers start leaving.

## Play

Open `index.html` in a browser. No build step and no server needed.

To host it for a team, turn on GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch, root folder).

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

1. **Policies**: upload text, Markdown or CSV files, or paste text. During a call, trainees can search them with the **Policies** button. Policies are saved in the browser.
2. **Call logs to scenarios**: upload call logs, then select **Build prompt for Claude**. This builds one prompt with your policies, your logs and the scenario format. Paste it into Claude, and Claude writes scenarios based on your real calls. Logs stay in the open tab and are never sent anywhere by the page. Remove customer names, addresses and account numbers before sharing logs with any AI tool.
3. **Import scenarios**: paste the JSON Claude returns, or import a `.json` file. Invalid entries are skipped with a reason. You can train on your scenarios alone, export them to share with other trainers, or remove them.
4. **Trainee progress**: progress saves automatically in the browser. **Save progress file** downloads a `.json` file with the trainee's name. **Load progress file** restores it on any computer. A trainer can collect these files to review progress.

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
| `options` | Single-step calls: the choices. `s: 2` is best practice, `s: 1` is acceptable but incomplete, `s: 0` is wrong. `why` explains the rating. |
| `steps` | Multi-step calls, instead of `options`: a list of steps. Each has `options`, plus optional `say` (what the customer says or what the CSR finds) and `data` (new rows). |
| `lesson` | One-line takeaway shown at the end of the call |

Keep the four options similar in length so the best answer doesn't stand out by being the longest.

Built-in scenarios describe general support practice. Credits, verification steps and escalation paths vary by company, so adapt them to your own policies.
