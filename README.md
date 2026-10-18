# Signal Desk

An idle tycoon game for training customer service reps (CSRs) at wireless ISPs (WISPs).

You run the support desk at a small fixed-wireless ISP. Subscribers pay you every second. You spend that money on towers, marketing, staff and tools. Calls come into a queue:

- **Routine calls** close with one click.
- **Coaching calls** are the training. Each one shows the customer's complaint plus account and network data (signal in dBm, SNR, sector load, CPE status). The trainee picks one of four actions and sees why it was best practice, partly right or wrong.

Good answers raise customer satisfaction (CSAT), which grows the subscriber base. Poor answers and callers left waiting push CSAT down, and customers start leaving.

## Play

Open `index.html` in a browser. No build step and no server needed.

To host it for a team, turn on GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch, root folder).

## What it trains

17 coaching calls across 11 topics: connectivity, speed, signal and line of sight, outages, safety, billing, sales, equipment, network (CGNAT), security (caller verification) and escalation.

New coaching calls lean toward scenarios the trainee hasn't seen and topics they keep missing. The **Training record** panel shows accuracy for each topic and lists lessons to review until the trainee gets that call right.

## Adding or editing scenarios

All coaching calls live in [`scenarios.js`](scenarios.js). Each one has:

| Field | Meaning |
| --- | --- |
| `id` | Unique short name |
| `topic` | Topic shown in the training record. A new topic name adds a new row. |
| `caller`, `plan` | Who is calling and their service plan |
| `quote` | What the customer says |
| `data` | `[label, value]` rows shown in the account and network panel |
| `options` | Four actions. `s: 2` is best practice, `s: 1` is acceptable but incomplete, `s: 0` is wrong. `why` explains the rating. |
| `lesson` | One-line takeaway shown after the answer |

The scenarios describe general fixed-wireless support practice. Credits, verification steps and escalation paths vary by company, so adapt them to your own policies.

## Saving

Progress saves in each player's browser (`localStorage`). Scores are not sent anywhere, so a trainer can't see them centrally yet.
