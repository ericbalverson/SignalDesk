'use strict';
// Signal Desk game logic. Scenarios load from scenarios/*.js before this file.

const ROUTINE = ['Asked for their next bill date', 'Reset their Wi-Fi password', 'Updated the card on file', 'Asked about holiday office hours',
  'Confirmed an install appointment', 'Requested a paper statement', 'Asked how to read their usage', 'Changed their billing address',
  'Asked about the referral credit', 'Asked how to set up autopay', 'Wanted a copy of last month’s bill', 'Asked how to change their Wi-Fi name'];
const NAMES = ['A. Ruiz', 'B. Okafor', 'C. Lindqvist', 'D. Haddad', 'E. Moreno', 'F. Tran', 'G. Novak', 'H. Begay', 'I. Kowalski', 'J. Mensah',
  'K. Sato', 'L. Duarte', 'M. O’Brien', 'N. Castillo', 'O. Fischer', 'P. Nguyen', 'Q. Adams', 'R. Yazzie', 'S. Patel', 'T. Hughes',
  'U. Ibarra', 'V. Kim', 'W. Johansson', 'X. Molina', 'Y. Abebe', 'Z. Carter'];
const RANKS = [[0, 'Trainee', 1], [60, 'Tier 1 CSR', 1.25], [180, 'Tier 2 CSR', 1.5], [400, 'Senior CSR', 2], [800, 'Support Lead', 2.5]];
const UPGRADES = [
  { id: 'kb', name: 'Knowledge base', cost: 250, d: 'Adds a “Check KB” button that rules out one wrong answer per step.' },
  { id: 'remote', name: 'Remote diagnostics', cost: 600, d: 'Routine calls close faster and pay double.' },
  { id: 'mon', name: 'Network monitoring', cost: 1400, d: 'Catch problems before customers call: 20% fewer calls.' },
  { id: 'portal', name: 'Self-service portal', cost: 3200, d: 'Customers pay bills and reset Wi-Fi online: 20% fewer calls.' },
];
const SAVE_KEY = 'signal-desk-v1', LIB_KEY = 'signal-desk-library';
const NET_LABEL = { wireless: 'Wireless', fiber: 'Fiber', any: 'Any network' };
const RATING = ['Not the right call', 'Partly right', 'Best practice'];

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };

// ---------- Scenarios ----------
function rows(d) { return Array.isArray(d) ? d.map(r => Array.isArray(r) ? [String(r[0] ?? ''), String(r[1] ?? '')] : [String(r), '']) : [] }
function norm(sc, custom) {
  const steps = (sc.steps || [{ options: sc.options }]).map(st => ({
    say: st.say ? String(st.say) : '', data: rows(st.data),
    options: st.options.map(o => ({ t: String(o.t), s: o.s, why: String(o.why || '') })) }));
  return { id: String(sc.id), net: ['wireless', 'fiber', 'any'].includes(sc.net) ? sc.net : 'any', topic: String(sc.topic),
    caller: sc.caller ? String(sc.caller) : '', plan: String(sc.plan || ''), quotes: (sc.quotes || [sc.quote]).map(String),
    data: rows(sc.data), steps, lesson: String(sc.lesson || ''), custom, kind: sc.kind || '' };
}
function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not a scenario object';
  if (typeof raw.id !== 'string' || !raw.id.trim()) return 'missing "id"';
  if (typeof raw.topic !== 'string' || !raw.topic.trim()) return 'missing "topic"';
  const quotes = raw.quotes || (raw.quote ? [raw.quote] : null);
  if (!Array.isArray(quotes) || !quotes.length || quotes.some(q => typeof q !== 'string')) return 'needs "quotes" (a list of what the customer says)';
  const steps = raw.steps || [{ options: raw.options }];
  if (!Array.isArray(steps) || !steps.length) return 'needs "options" or "steps"';
  for (let i = 0; i < steps.length; i++) {
    const o = steps[i] && steps[i].options;
    if (!Array.isArray(o) || o.length < 2 || o.length > 5) return `step ${i + 1} needs 2 to 5 options`;
    if (o.some(x => !x || typeof x.t !== 'string' || ![0, 1, 2].includes(x.s))) return `step ${i + 1} has an option without "t" text or an "s" of 0, 1 or 2`;
    if (!o.some(x => x.s === 2)) return `step ${i + 1} has no best answer (s: 2)`;
  }
  if (raw.data && !Array.isArray(raw.data)) return '"data" must be a list of [label, value] pairs';
  return null;
}
const BUILTIN = (window.SIGNAL_DESK_SCENARIOS || []).filter(s => !validate(s)).map(s => norm(s, false));

// ---------- Library (company knowledge, policies, custom scenarios; kept in this browser) ----------
let LIB = { policies: [], custom: [], onlyCustom: false, kb: [], kbPages: [], setupDone: false };
try { Object.assign(LIB, JSON.parse(localStorage.getItem(LIB_KEY)) || {}) } catch {}
let LOGS = []; // call logs live only in this tab
let POOL = [], KBPOOL = [], BYID = new Map();
function saveLib() {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(LIB)) }
  catch { toast('Browser storage is full. Export your scenarios to keep them.') }
}
function rebuildPool() {
  const custom = LIB.custom.filter(s => !validate(s)).map(s => norm(s, true));
  KBPOOL = Knowledge.toScenarios(LIB.kb || []).map(s => norm(s, false));
  BYID = new Map(BUILTIN.concat(custom, KBPOOL).map(s => [s.id, s]));
  POOL = LIB.onlyCustom && custom.length ? custom : BUILTIN.concat(custom);
}
rebuildPool();

// ---------- State ----------
let S;
function fresh() {
  return { cash: 80, subs: 30, towers: 1, mktg: 0, csrs: 0, up: {}, csat: 75, xp: 0,
    queue: [], active: null, nextId: 1041, callAcc: 0.6, csrAcc: 0,
    stats: {}, netStats: { wireless: { a: 0, c: 0 }, fiber: { a: 0, c: 0 } }, seen: {}, missed: [], log: [],
    handled: 0, abandoned: 0, paused: false, trainee: '', savedAt: null,
    set: { fiber: 50, pace: 1, hold: true, kbShare: 30 } };
}
function migrate(s) {
  const f = fresh();
  s = Object.assign(f, s || {});
  s.set = Object.assign(fresh().set, s.set || {});
  s.netStats = Object.assign(fresh().netStats, s.netStats || {});
  s.up = s.up || {}; s.stats = s.stats || {}; s.seen = s.seen || {}; s.log = s.log || []; s.missed = s.missed || [];
  s.queue = (s.queue || []).filter(q => !q.sid || BYID.has(q.sid)).map(q => Object.assign({ net: 'wireless' }, q));
  if (s.active && (s.active.step == null || !BYID.has(s.active.sid))) s.active = null;
  return s;
}
function save() {
  S.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)) } catch {}
}
function load() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null } catch { return null } }

// ---------- Derived numbers ----------
const cap = () => S.towers * 80;
const revRate = () => S.subs * 0.06;
const rank = () => { let r = RANKS[0]; for (const x of RANKS) if (S.xp >= x[0]) r = x; return r };
const nextRank = () => RANKS.find(x => x[0] > S.xp);
const towerCost = () => Math.round(150 * Math.pow(1.7, S.towers - 1));
const mktgCost = () => Math.round(60 * Math.pow(1.5, S.mktg));
const csrCost = () => Math.round(120 * Math.pow(1.45, S.csrs));
const routinePay = () => (3 + S.subs * 0.02) * (S.up.remote ? 2 : 1);
const coachPay = () => (25 + S.subs * 0.3) * rank()[2];
const callRate = () => S.subs * 0.0035 * S.set.pace * (S.up.mon ? 0.8 : 1) * (S.up.portal ? 0.8 : 1);
const held = () => S.set.hold && !!S.active;

function money(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + Math.floor(n).toLocaleString();
}
function log(html) { S.log.unshift(html); S.log.length = Math.min(S.log.length, 30); renderLog() }
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200) }

// ---------- Calls ----------
function pickScenario(net) {
  const busy = new Set(S.queue.map(q => q.sid).filter(Boolean));
  if (S.active) busy.add(S.active.sid);
  const kb = KBPOOL.filter(s => !busy.has(s.id));
  if (kb.length && Math.random() * 100 < S.set.kbShare) return weighted(kb);
  let pool = POOL.filter(s => !busy.has(s.id) && (s.net === net || s.net === 'any'));
  if (!pool.length) pool = POOL.filter(s => !busy.has(s.id));
  if (!pool.length) pool = kb;
  return pool.length ? weighted(pool) : null;
}
function weighted(pool) {
  // Lean toward unseen calls and topics the trainee keeps missing
  const w = pool.map(s => { const st = S.stats[s.topic] || { a: 0, c: 0 }; return (S.seen[s.id] ? 1 : 3) + Math.max(0, st.a - st.c) * 1.5 });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i] }
  return pool[pool.length - 1];
}
function spawnCall() {
  if (S.queue.length >= 12) { S.abandoned++; S.csat -= 2; log('<b>Busy signal.</b> Queue full, a caller gave up.'); return }
  const net = Math.random() * 100 < S.set.fiber ? 'fiber' : 'wireless';
  const coachWaiting = S.queue.filter(q => q.sid).length;
  const sc = (Math.random() < 0.32 && coachWaiting < 3) ? pickScenario(net) : null;
  S.queue.push({ id: S.nextId++, sid: sc ? sc.id : null, net: sc && sc.net !== 'any' ? sc.net : net,
    name: (sc && sc.caller) || pickOne(NAMES), age: 0, pat: sc ? (sc.steps.length > 1 ? 180 : 120) : 45 });
}
function resolveRoutine(q, byCsr) {
  const pay = routinePay() * (byCsr ? 0.8 : 1);
  S.cash += pay; S.csat += byCsr ? 0.3 : 0.5; S.handled++;
  log(`<b>${byCsr ? 'CSR' : 'You'}</b> · ${esc(q.name)}: ${ROUTINE[q.id % ROUTINE.length].toLowerCase()}. +${money(pay)}`);
}
function answer(id) {
  if (S.active) { toast('Finish the call you’re on first.'); return }
  const i = id == null ? 0 : S.queue.findIndex(q => q.id === id);
  if (i < 0 || !S.queue.length) return;
  const q = S.queue.splice(i, 1)[0];
  if (!q.sid) { resolveRoutine(q, false); renderQueue(); return }
  const sc = BYID.get(q.sid);
  S.active = { qid: q.id, sid: q.sid, net: q.net, name: q.name, qi: Math.floor(Math.random() * sc.quotes.length),
    step: 0, order: shuffled(sc.steps[0].options.length), choice: null, struck: null, picks: [], pay: 0, csat: 0, xp: 0 };
  polOpen = false;
  renderQueue(); renderLive();
}
function choose(k) {
  const a = S.active; if (!a || a.choice != null) return;
  const sc = BYID.get(a.sid), steps = sc.steps, s = steps[a.step].options[k].s, multi = steps.length > 1;
  a.choice = k; a.picks.push({ k, s });
  const ts = S.stats[sc.topic] || (S.stats[sc.topic] = { a: 0, c: 0 });
  ts.a++; if (s === 2) ts.c++;
  const ns = S.netStats[a.net]; if (ns) { ns.a++; if (s === 2) ns.c++ }
  const before = rank()[1];
  const pay = coachPay() * [0, 0.4, 1][s] * (multi ? 0.7 : 1), dc = [-5, 1, 4][s] * (multi ? 0.6 : 1), dx = [2, 5, 12][s];
  S.cash += pay; S.csat += dc; S.xp += dx; a.pay += pay; a.csat += dc; a.xp += dx;
  if (s === 0) S.missed = [{ id: sc.id, topic: sc.topic, lesson: sc.lesson }, ...S.missed.filter(m => m.id !== sc.id)].slice(0, 8);
  if (a.step === steps.length - 1) {
    S.handled++; S.seen[sc.id] = (S.seen[sc.id] || 0) + 1;
    if (a.picks.every(p => p.s === 2)) S.missed = S.missed.filter(m => m.id !== sc.id);
    const best = a.picks.filter(p => p.s === 2).length;
    log(`<b>Coaching</b> · ${esc(sc.topic)}: ${multi ? `${best} of ${steps.length} steps best` : ['missed', 'partial', 'best answer'][s]}${a.pay ? ' +' + money(a.pay) : ''}`);
  }
  if (rank()[1] !== before) toast(`Promoted to ${rank()[1]}. Coaching calls now pay ×${rank()[2]}.`);
  clampCsat(); renderLive(); renderRecord(); save();
}
function nextStep() {
  const a = S.active, sc = a && BYID.get(a.sid);
  if (!a || a.choice == null || a.step >= sc.steps.length - 1) return;
  a.step++; a.order = shuffled(sc.steps[a.step].options.length); a.choice = null; a.struck = null;
  renderLive();
}
function checkKb() {
  const a = S.active; if (!a || a.struck != null || !S.up.kb || a.choice != null) return;
  const opts = BYID.get(a.sid).steps[a.step].options;
  const wrong = a.order.filter(k => opts[k].s === 0);
  if (wrong.length) a.struck = pickOne(wrong);
  renderLive();
}
function closeCall() { S.active = null; polOpen = false; renderLive(); renderQueue(); save() }
const clampCsat = () => { S.csat = Math.max(0, Math.min(100, S.csat)) };

// ---------- Shop ----------
function siteWord() { return S.set.fiber >= 70 ? 'fiber area' : S.set.fiber <= 30 ? 'tower' : 'tower or fiber area' }
function buy(kind) {
  let c;
  if (kind === 'tower') { c = towerCost(); if (S.cash < c) return; S.cash -= c; S.towers++; log(`<b>New ${siteWord()} lit.</b> Room for ${cap()} subscribers.`) }
  else if (kind === 'mktg') { c = mktgCost(); if (S.cash < c) return; S.cash -= c; S.mktg++; log('<b>Marketing</b> campaign launched.') }
  else if (kind === 'csr') { c = csrCost(); if (S.cash < c) return; S.cash -= c; S.csrs++; log(`<b>Hired CSR #${S.csrs}.</b> They take routine calls.`) }
  else { const u = UPGRADES.find(x => x.id === kind); if (!u || S.up[kind] || S.cash < u.cost) return; S.cash -= u.cost; S.up[kind] = 1; log(`<b>${u.name}</b> installed.`); if (S.active) renderLive() }
  updateShop(); save();
}

// ---------- Tick ----------
function tick(dt) {
  if (S.paused) return;
  S.cash += revRate() * dt;
  const csatF = Math.max(-1, Math.min(1, (S.csat - 55) / 45));
  S.subs = Math.max(5, Math.min(cap(), S.subs + (0.12 + S.mktg * 0.22) * csatF * dt));
  S.atCap = S.subs >= cap() && csatF > 0;
  if (!held()) {
    S.callAcc += callRate() * dt;
    while (S.callAcc >= 1) { S.callAcc--; spawnCall() }
    for (const q of S.queue) q.age += dt;
    const gone = S.queue.filter(q => q.age >= q.pat);
    if (gone.length) {
      S.queue = S.queue.filter(q => q.age < q.pat);
      for (const q of gone) { S.abandoned++; S.csat -= q.sid ? 4 : 2; log(`<b>Abandoned</b> · ${esc(q.name)} hung up after waiting.`) }
    }
  }
  S.csrAcc += S.csrs * dt / (S.up.remote ? 4 : 6);
  while (S.csrAcc >= 1) {
    const i = S.queue.findIndex(q => !q.sid);
    if (i < 0) { S.csrAcc = Math.min(S.csrAcc, 1); break }
    S.csrAcc--; resolveRoutine(S.queue.splice(i, 1)[0], true);
  }
  S.csat += (70 - S.csat) * 0.004 * dt;
  clampCsat();
}

// ---------- Rendering: queue, live call ----------
let qSig = null, polOpen = false;
function netTag(net) { return `<span class="tag ${net}">${NET_LABEL[net] || net}</span>` }
function callTag(q) {
  const sc = q.sid && BYID.get(q.sid);
  if (!sc) return '<span class="tag">Routine</span>';
  if (sc.kind === 'kb') return '<span class="tag kb">Knowledge</span>';
  return `<span class="tag coach">${sc.steps.length > 1 ? 'Multi-step' : 'Coaching'}</span>`;
}
function renderQueue() {
  const sig = S.queue.map(q => q.id).join(',');
  $('qCount').textContent = S.paused ? 'Paused' : S.queue.length + ' waiting';
  $('answerBtn').disabled = !S.queue.length || !!S.active;
  const hn = $('heldNote'); hn.hidden = !(held() && !S.paused);
  if (!hn.hidden) hn.textContent = 'Queue on hold while you’re on this call.';
  if (sig !== qSig) {
    qSig = sig;
    $('queue').innerHTML = S.queue.length ? S.queue.map(q => `<li><button data-q="${q.id}">
      <span class="qrow"><span>#${q.id} · ${esc(q.name)}</span><span class="tags">${netTag(q.net)}${callTag(q)}</span></span>
      <span class="pat"><i id="p${q.id}"></i></span></button></li>`).join('')
      : '<li class="empty">Phones are quiet. Calls arrive as you add subscribers.</li>';
  }
  for (const q of S.queue) { const el = $('p' + q.id); if (el) { const f = 1 - q.age / q.pat; el.style.width = (f * 100) + '%'; el.classList.toggle('low', f < 0.3) } }
}
function renderLog() { $('log').innerHTML = S.log.slice(0, 12).map(l => `<li>${l}</li>`).join('') }

function renderLive() {
  const el = $('live'), a = S.active;
  if (!a) {
    const coach = S.queue.filter(q => q.sid).length;
    el.innerHTML = `<div class="idle"><h3>No active call</h3>
      <p>${coach ? `${coach} coaching call${coach > 1 ? 's are' : ' is'} waiting. They pay the most and teach the most.` : 'Routine calls pay a little. Coaching calls test your troubleshooting and pay far more.'}</p>
      <p class="sub">${S.paused ? 'The game is paused. Press Resume to continue.' : 'Answer a call from the queue to get started.'}</p></div>`;
    return;
  }
  const sc = BYID.get(a.sid), steps = sc.steps, st = steps[a.step], done = a.choice != null;
  const multi = steps.length > 1, last = a.step === steps.length - 1;
  const acct = sc.data.map(r => [...r, false]);
  steps.slice(1, a.step + 1).forEach((s, i) => s.data.forEach(r => acct.push([...r, i + 1 === a.step])));
  const hist = multi && a.step ? `<ul class="hist">${a.picks.slice(0, a.step).map((p, i) =>
    `<li>Step ${i + 1}: ${esc(steps[i].options[p.k].t)} <b class="s${p.s}">${RATING[p.s]}</b></li>`).join('')}</ul>` : '';
  const L = 'ABCDE';
  const opts = a.order.map((k, i) => {
    const o = st.options[k];
    let cls = 'opt';
    if (done) { if (o.s === 2) cls += ' best'; if (k === a.choice) cls += ' pick s' + o.s }
    else if (k === a.struck) cls += ' struck';
    return `<button class="${cls}" data-o="${k}" ${done || k === a.struck ? 'disabled' : ''}>
      <span class="l">${L[i]}</span><span>${esc(o.t)}</span>${done && (k === a.choice || o.s === 2) && o.why ? `<span class="why">${esc(o.why)}</span>` : ''}</button>`;
  }).join('');
  let verdict = '<div class="sub">What do you do next?</div>';
  if (done && !last) {
    const s = st.options[a.choice].s;
    verdict = `<div class="verdict s${s}"><strong>${RATING[s]}</strong><p class="sub">Step ${a.step + 1} of ${steps.length}. Continue to see what happens next.</p></div>`;
  } else if (done) {
    const ss = a.picks.map(p => p.s), overall = ss.every(x => x === 2) ? 2 : ss.includes(0) ? 0 : 1;
    const title = multi ? `${ss.filter(x => x === 2).length} of ${steps.length} steps best` : RATING[overall];
    verdict = `<div class="verdict s${overall}"><strong>${title}</strong>${sc.lesson ? `<p>${esc(sc.lesson)}</p>` : ''}
      <p class="sub mono">${a.pay ? '+' + money(a.pay) + ' · ' : ''}CSAT ${a.csat >= 0 ? '+' : '−'}${Math.abs(Math.round(a.csat * 10) / 10)} · XP +${a.xp}</p></div>`;
  }
  const tools = [];
  if (!done && S.up.kb) tools.push(`<button class="btn" id="kbBtn" ${a.struck != null ? 'disabled' : ''}>Check KB</button>`);
  if (hasReference()) tools.push(`<button class="btn" id="polBtn" aria-expanded="${polOpen}">Reference</button>`);
  if (done && !last) tools.unshift('<button class="btn primary" id="nextBtn">Next step</button>');
  if (done && last) tools.unshift('<button class="btn primary" id="closeBtn">Close ticket</button>');
  el.innerHTML = `
    <div class="callhead"><h2>On the line · ${esc(a.name)}</h2><span class="tags">${netTag(a.net)}<span class="tag coach">${esc(sc.topic)}</span>${multi ? `<span class="tag">Step ${a.step + 1} of ${steps.length}</span>` : ''}</span></div>
    <p class="quote">“${esc(sc.quotes[a.qi] || sc.quotes[0])}”</p>
    ${acct.length ? `<div class="acct-h">Account &amp; network${sc.plan ? ' · plan ' + esc(sc.plan) : ''}</div>
    <dl class="acct">${acct.map(([k, v, n]) => `<dt class="${n ? 'new' : ''}">${esc(k)}</dt><dd class="${n ? 'new' : ''}">${esc(v)}</dd>`).join('')}</dl>` : ''}
    ${hist}
    ${st.say ? `<div class="say">${esc(st.say)}</div>` : ''}
    ${verdict}
    <div class="opts">${opts}</div>
    <div class="row">${tools.join('')}</div>
    <div class="pol" id="pol" ${polOpen ? '' : 'hidden'}>
      <input class="field" id="polQ" placeholder="Search policies and company knowledge" value="${esc(sc.kind === 'kb' ? '' : sc.topic)}">
      <div class="res" id="polRes"></div>
    </div>`;
  markTerms(el, a.net);
  if (polOpen) renderPolicyHits();
  const focusBtn = $('nextBtn') || $('closeBtn'); if (focusBtn) focusBtn.focus();
}
const hasReference = () => true;
function policyHits(q) {
  const terms = q.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const paras = LIB.policies.flatMap(p => p.text.split(/\n\s*\n/).map(t => ({ name: 'Policy · ' + p.name, t: t.trim() })))
    .concat((LIB.kb || []).map(e => ({ name: 'FAQ · ' + e.cat, t: e.q + '\n' + e.a })))
    .concat(GLOSSARY.map(g => ({ name: 'Glossary · ' + g.name, t: g.what + '\n' + g.csat })))
    .concat((LIB.kbPages || []).flatMap(p => p.text.split(/\n\s*\n/).map(t => ({ name: 'Website · ' + p.title, t: t.trim() }))))
    .filter(p => p.t);
  if (!terms.length) return paras.slice(0, 6);
  return paras.map(p => ({ ...p, n: terms.filter(t => p.t.toLowerCase().includes(t)).length })).filter(p => p.n).sort((a, b) => b.n - a.n).slice(0, 6);
}
function renderPolicyHits() {
  const q = $('polQ'), res = $('polRes'); if (!q || !res) return;
  const hits = policyHits(q.value);
  res.innerHTML = hits.length ? hits.map(h => `<div><span class="src">${esc(h.name)}</span>\n${esc(h.t.length > 700 ? h.t.slice(0, 700) + '…' : h.t)}</div>`).join('')
    : '<p class="sub">Nothing matches. Try other words.</p>';
}

// ---------- Rendering: shop, stats, controls, record ----------
const shopEls = {};
function buildShop() {
  const items = [
    ['tower', 'Expand coverage', ''],
    ['mktg', 'Marketing campaign', 'More sign-ups each day while CSAT stays healthy.'],
    ['csr', 'Hire a CSR', 'Handles routine calls automatically. Coaching calls stay yours.'],
  ];
  let h = '<div class="shop-h">Build</div>' + items.map(([id, n, d]) => `<button class="item" data-b="${id}"><span class="t"><span>${n} <span class="sub" data-own="${id}"></span></span><span class="mono" data-c="${id}"></span></span><span class="d" data-d="${id}">${d}</span></button>`).join('');
  h += '<div class="shop-h">Upgrades</div>' + UPGRADES.map(u => `<button class="item" data-b="${u.id}"><span class="t"><span>${u.name}</span><span class="mono" data-c="${u.id}">${money(u.cost)}</span></span><span class="d">${u.d}</span></button>`).join('');
  $('shop').innerHTML = h;
  $('shop').querySelectorAll('[data-b]').forEach(b => shopEls[b.dataset.b] = b);
}
function updateShop() {
  const c = { tower: towerCost(), mktg: mktgCost(), csr: csrCost() };
  const own = { tower: S.towers, mktg: S.mktg, csr: S.csrs };
  for (const k in c) {
    shopEls[k].disabled = S.cash < c[k];
    shopEls[k].querySelector('[data-c]').textContent = money(c[k]);
    shopEls[k].querySelector('[data-own]').textContent = '×' + own[k];
  }
  shopEls.tower.querySelector('[data-d]').textContent = `Light a new ${siteWord()} with room for 80 more subscribers.`;
  for (const u of UPGRADES) {
    const b = shopEls[u.id], have = !!S.up[u.id];
    b.disabled = have || S.cash < u.cost; b.classList.toggle('owned', have);
    b.querySelector('[data-c]').textContent = have ? 'Installed' : money(u.cost);
  }
}
function renderStats() {
  $('sCash').textContent = money(S.cash);
  $('sSubs').textContent = Math.floor(S.subs) + ' / ' + cap();
  $('mSubs').style.width = (S.subs / cap() * 100) + '%';
  $('sRev').textContent = '$' + revRate().toFixed(2) + '/s';
  $('sCsat').textContent = Math.round(S.csat) + (S.csat < 55 ? ' ↓ churn' : S.atCap ? ' · full' : '');
  $('mCsat').style.width = S.csat + '%';
  const r = rank(), n = nextRank();
  $('sRank').textContent = r[1];
  $('sXp').textContent = S.xp + ' XP';
  $('mXp').style.width = (n ? (S.xp - r[0]) / (n[0] - r[0]) * 100 : 100) + '%';
}
function renderControls() {
  const f = S.set.fiber;
  $('mix').value = f;
  $('mixVal').textContent = f === 0 ? 'Wireless only' : f === 100 ? 'Fiber only' : `Wireless ${100 - f}% · Fiber ${f}%`;
  $('mixChips').querySelectorAll('[data-mix]').forEach(b => b.classList.toggle('on', +b.dataset.mix === f));
  $('pace').value = S.set.pace;
  $('paceVal').textContent = S.set.pace.toFixed(2).replace(/0$/, '') + '×';
  const per = callRate(); $('paceHint').textContent = per > 0 ? `About one call every ${Math.max(1, Math.round(1 / per))} s right now` : '';
  $('hold').checked = S.set.hold;
  const pb = $('pauseBtn'); pb.textContent = S.paused ? 'Resume' : 'Pause'; pb.classList.toggle('on', S.paused); pb.setAttribute('aria-pressed', S.paused);
}
function renderRecord() {
  let A = 0, C = 0;
  const topics = [...new Set(POOL.map(s => s.topic).concat(Object.keys(S.stats).filter(t => S.stats[t].a)))];
  $('recBody').innerHTML = topics.map(t => {
    const st = S.stats[t] || { a: 0, c: 0 }; A += st.a; C += st.c;
    const p = st.a ? st.c / st.a : 0;
    return `<tr><td>${esc(t)}</td><td class="num">${st.a}</td><td class="num">${st.c}</td>
      <td>${st.a ? `<div class="bar"><i class="${p < .5 ? 'lowv' : p < .8 ? 'mid' : ''}" style="width:${p * 100}%"></i></div>` : '<span class="sub">Not yet</span>'}</td></tr>`;
  }).join('');
  const pct = x => x.a ? Math.round(x.c / x.a * 100) + '%' : '–';
  $('recSum').textContent = (S.trainee ? S.trainee + ' · ' : '') + (A ? `${C}/${A} best (${Math.round(C / A * 100)}%) · Wireless ${pct(S.netStats.wireless)} · Fiber ${pct(S.netStats.fiber)}` : 'No coaching calls yet');
  $('lessons').innerHTML = S.missed.length ? S.missed.map(m => `<li><div class="tp">${esc(m.topic)}</div>${esc(m.lesson)}</li>`).join('')
    : '<li style="border-color:var(--good)">Missed answers show up here with the lesson, until you get that call fully right.</li>';
}

// ---------- Library UI ----------
function readFiles(input) { return Promise.all([...input.files].map(f => f.text().then(text => ({ name: f.name, text })))) }
function renderLib() {
  $('polList').innerHTML = LIB.policies.map((p, i) => `<li><span>${esc(p.name)} <span class="sub">· ${Math.round(p.text.length / 1000) || '<1'}k chars</span></span><button class="x" data-rmpol="${i}" aria-label="Remove ${esc(p.name)}">×</button></li>`).join('')
    || '<li class="sub">No policies yet.</li>';
  $('logList').innerHTML = LOGS.map((p, i) => `<li><span>${esc(p.name)} <span class="sub">· ${Math.round(p.text.length / 1000) || '<1'}k chars</span></span><button class="x" data-rmlog="${i}" aria-label="Remove ${esc(p.name)}">×</button></li>`).join('')
    || '<li class="sub">No call logs loaded.</li>';
  $('custList').innerHTML = LIB.custom.map((s, i) => `<li><span>${esc(s.topic)} <span class="sub">· ${NET_LABEL[s.net] || 'Any network'}${s.steps ? ' · ' + s.steps.length + ' steps' : ''} · ${esc(String(s.id).replace(/^c_/, ''))}</span></span><button class="x" data-rmcust="${i}" aria-label="Remove scenario">×</button></li>`).join('')
    || '<li class="sub">No custom scenarios yet. Built-in calls are used.</li>';
  $('onlyCustom').checked = !!LIB.onlyCustom;
  $('onlyCustom').disabled = !LIB.custom.length;
  $('custExport').disabled = $('custClear').disabled = !LIB.custom.length;
  $('trainee').value = S.trainee || '';
  $('saveMsg').textContent = S.savedAt ? 'Last saved in this browser at ' + new Date(S.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  $('saveMsg').className = 'msg sub';
}
function msg(id, text, ok) { const m = $(id); m.textContent = text; m.className = 'msg ' + (ok ? 'ok' : 'err') }
function download(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = s => (s || 'trainee').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trainee';

function importScenarios(text) {
  let data;
  try { data = JSON.parse(text) } catch {
    const i = text.indexOf('['), j = text.lastIndexOf(']');
    try { data = JSON.parse(text.slice(i, j + 1)) } catch { return msg('impMsg', 'That isn’t valid JSON. Paste only the list Claude returned, from the opening [ to the closing ].', false) }
  }
  if (!Array.isArray(data)) data = data && Array.isArray(data.scenarios) ? data.scenarios : [data];
  let ok = 0; const bad = [];
  for (const raw of data) {
    const err = validate(raw);
    if (err) { bad.push(`${raw && raw.id ? raw.id : 'item ' + (data.indexOf(raw) + 1)}: ${err}`); continue }
    const sc = JSON.parse(JSON.stringify(raw)); sc.id = 'c_' + String(raw.id).replace(/^c_/, '');
    const i = LIB.custom.findIndex(x => x.id === sc.id);
    if (i >= 0) LIB.custom[i] = sc; else LIB.custom.push(sc);
    ok++;
  }
  saveLib(); rebuildPool(); renderLib(); renderRecord();
  msg('impMsg', `Imported ${ok} scenario${ok === 1 ? '' : 's'}.${bad.length ? ` Skipped ${bad.length}: ${bad.slice(0, 3).join('; ')}${bad.length > 3 ? '…' : ''}` : ''}`, ok > 0);
  if (ok) $('impText').value = '';
}

function knowledgeText() {
  const faq = (LIB.kb || []).map(e => `Q: ${e.q}\nA: ${e.a}`).join('\n\n').slice(0, 30000);
  const pages = (LIB.kbPages || []).map(p => `--- ${p.title} ---\n${p.text}`).join('\n\n').slice(0, 30000);
  return [faq, pages].filter(Boolean).join('\n\n');
}
function buildPrompt() {
  const netSel = $('genNet').value, count = Math.max(1, Math.min(30, +$('genCount').value || 8));
  const netText = netSel === 'wireless' ? 'fixed wireless' : netSel === 'fiber' ? 'fiber to the home (PON)'
    : S.set.fiber === 0 ? 'fixed wireless' : S.set.fiber === 100 ? 'fiber to the home (PON)' : `a mix of about ${100 - S.set.fiber}% fixed wireless and ${S.set.fiber}% fiber`;
  const example = ['w-poe', 'm-f-slow'].map(id => (window.SIGNAL_DESK_SCENARIOS || []).find(s => s.id === id)).filter(Boolean);
  const topics = [...new Set(BUILTIN.map(s => s.topic))].join(', ');
  return `You are helping a support trainer at an internet service provider turn real call logs and company policies into training scenarios for Signal Desk, a customer service rep (CSR) training game.

Write ${count} scenarios as a JSON array. The network is ${netText}.

Rules:
- Base each scenario on a real issue from the call logs below. Do not copy customer names, addresses, phone numbers, account numbers or other personal details. Invent neutral details instead.
- Follow the company policies and FAQ below. Use the company's real plan names, prices and procedures where they're given.
- Follow the company policies below. Where a policy sets a rule (credits, verification, escalation, appointments), the best answer must follow it.
- "quotes": 3 different ways different customers might describe the same problem, in plain spoken language. Vary the wording so trainees can't recognize a call by its first few words.
- Each step has exactly 4 options: one best practice (s: 2), one acceptable but incomplete (s: 1), and two wrong (s: 0). Each option has a one-sentence "why".
- Keep options similar in length. The best option must not usually be the longest or most detailed one.
- About one in four scenarios should be multi-step, with 2 to 4 "steps". In later steps, "say" is what the customer says or what the CSR finds after the best action on the step before, and "data" adds new rows to the account panel.
- "data" rows are [label, value] pairs showing what a CSR sees in their tools: equipment status, signal or optical levels, account and billing state, outage notes.
- "topic": one of ${topics}, or a short new topic name if none fits.
- "net": "wireless", "fiber" or "any" (for billing, security and other calls that don't depend on the network).
- "id": short, unique, lowercase with dashes.
- "lesson": one sentence the trainee should remember.

Return only the JSON array, with no commentary before or after it.

Format examples (one single-step, one multi-step):
${JSON.stringify(example, null, 1)}

=== COMPANY POLICIES ===
${LIB.policies.length ? LIB.policies.map(p => `--- ${p.name} ---\n${p.text}`).join('\n\n') : '(No policies provided. Use common ISP support best practice.)'}

=== COMPANY FAQ AND WEBSITE CONTENT ===
${knowledgeText() || '(None provided.)'}

=== CALL LOGS ===
${LOGS.length ? LOGS.map(p => `--- ${p.name} ---\n${p.text}`).join('\n\n') : '(No call logs provided. Write realistic common calls for this network type.)'}
`;
}

// ---------- Horizon scene ----------
const cv = $('scene'), cx = cv.getContext('2d');
const HOUSES = Array.from({ length: 240 }, (_, i) => { const r = Math.sin(i * 12.9898) * 43758.5453; return [r - Math.floor(r), Math.abs((Math.sin(i * 78.233) * 9631.7) % 1)] });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function draw(t) {
  const w = cv.clientWidth, h = cv.clientHeight, dpr = devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement), tok = n => css.getPropertyValue(n).trim();
  cx.fillStyle = tok('--sky'); cx.fillRect(0, 0, w, h);
  const ground = x => h - 26 - Math.sin(x / w * Math.PI * 3) * 8;
  cx.fillStyle = tok('--hill'); cx.beginPath(); cx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) cx.lineTo(x, ground(x)); cx.lineTo(w, h); cx.fill();
  const lit = Math.floor(S.subs), shown = Math.min(240, Math.max(lit + 20, 60));
  for (let i = 0; i < shown; i++) {
    const x = HOUSES[i][0] * w, y = ground(x) + 4 + HOUSES[i][1] * 14;
    cx.fillStyle = i < lit ? tok('--warm') : tok('--muted');
    cx.globalAlpha = i < lit ? 0.9 : 0.35; cx.fillRect(x, y, 4, 3); cx.globalAlpha = 1;
  }
  const n = Math.min(S.towers, 12), nf = Math.round(n * S.set.fiber / 100), nw = n - nf;
  const xs = i => w * (i + 0.5) / n;
  // wireless towers on the left
  for (let i = 0; i < nw; i++) {
    const x = xs(i), base = ground(x), top = base - 70;
    if (!reduced && !S.paused) for (let k = 0; k < 2; k++) {
      const p = ((t / 2600 + k / 2 + i * 0.17) % 1);
      cx.strokeStyle = tok('--accent'); cx.globalAlpha = (1 - p) * 0.5; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(x, top + 6, 10 + p * Math.min(90, w / n * 0.6), Math.PI * 1.05, Math.PI * 1.95); cx.stroke();
    }
    cx.globalAlpha = 1; cx.strokeStyle = tok('--ink'); cx.lineWidth = 1.5; cx.beginPath();
    cx.moveTo(x - 9, base); cx.lineTo(x, top); cx.lineTo(x + 9, base);
    for (let s = 1; s < 5; s++) { const yy = base - s * 14, hw = 9 * (1 - s * 14 / 70); cx.moveTo(x - hw, yy); cx.lineTo(x + hw, yy - 7) }
    cx.stroke();
    cx.fillStyle = tok('--ink'); cx.fillRect(x - 6, top + 4, 3, 9); cx.fillRect(x + 3, top + 4, 3, 9);
    cx.fillStyle = tok('--bad'); cx.globalAlpha = reduced || Math.floor(t / 900) % 2 ? 1 : 0.25;
    cx.beginPath(); cx.arc(x, top - 2, 2.5, 0, 7); cx.fill(); cx.globalAlpha = 1;
  }
  // fiber poles on the right, strung together
  const poles = [];
  for (let i = nw; i < n; i++) { const x = xs(i), base = ground(x); poles.push([x, base - 46, base]) }
  if (poles.length) {
    cx.strokeStyle = tok('--fiber'); cx.lineWidth = 1.5; cx.beginPath();
    const first = poles[0], lastP = poles[poles.length - 1];
    cx.moveTo(first[0] - w / n / 2, first[1] + 6);
    for (const [x, top] of poles) cx.quadraticCurveTo(x - w / n / 4, top + 14, x, top + 3);
    cx.quadraticCurveTo(lastP[0] + w / n / 4, lastP[1] + 14, lastP[0] + w / n / 2, lastP[1] + 6);
    cx.stroke();
    for (const [x, top, base] of poles) {
      cx.strokeStyle = tok('--ink'); cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, top); cx.stroke();
      cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x - 8, top + 3); cx.lineTo(x + 8, top + 3); cx.stroke();
      cx.fillStyle = tok('--fiber'); cx.fillRect(x - 4, top + 10, 8, 6);
    }
    if (!reduced && !S.paused) {
      const span = (lastP[0] - first[0]) + w / n, p = (t / 1800) % 1, px = first[0] - w / n / 2 + p * span;
      cx.fillStyle = tok('--fiber'); cx.beginPath(); cx.arc(px, first[1] + 6, 2.5, 0, 7); cx.fill();
    }
  }
  if (S.towers > 12) { cx.fillStyle = tok('--muted'); cx.font = '12px ' + tok('--mono'); cx.fillText('+' + (S.towers - 12) + ' more sites', 8, 16) }
  requestAnimationFrame(draw);
}

// ---------- Events ----------
$('answerBtn').onclick = () => answer(null);
$('queue').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) answer(+b.dataset.q) });
$('shop').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b && !b.disabled) buy(b.dataset.b) });
$('live').addEventListener('keydown', e => {
  const g = e.target.closest('.gl');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openTerm(g.dataset.term) }
});
$('live').addEventListener('click', e => {
  const g = e.target.closest('.gl'); if (g) { e.preventDefault(); return openTerm(g.dataset.term) }
  const o = e.target.closest('[data-o]'); if (o && !o.disabled) return choose(+o.dataset.o);
  const id = e.target.id;
  if (id === 'closeBtn') closeCall();
  else if (id === 'nextBtn') nextStep();
  else if (id === 'kbBtn') checkKb();
  else if (id === 'polBtn') { polOpen = !polOpen; $('pol').hidden = !polOpen; e.target.setAttribute('aria-expanded', polOpen); if (polOpen) { renderPolicyHits(); $('polQ').focus() } }
});
$('live').addEventListener('input', e => { if (e.target.id === 'polQ') renderPolicyHits() });

$('pauseBtn').onclick = () => { S.paused = !S.paused; renderControls(); renderQueue(); if (!S.active) renderLive(); save() };
$('mix').addEventListener('input', e => { S.set.fiber = +e.target.value; renderControls(); updateShop() });
$('mixChips').addEventListener('click', e => { const b = e.target.closest('[data-mix]'); if (b) { S.set.fiber = +b.dataset.mix; renderControls(); updateShop(); save() } });
$('pace').addEventListener('input', e => { S.set.pace = +e.target.value; renderControls() });
$('hold').addEventListener('change', e => { S.set.hold = e.target.checked; renderQueue(); save() });
document.addEventListener('keydown', e => {
  if ($('term').open || $('setup').open) return;
  if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'p' || e.key === 'P') $('pauseBtn').click();
});

$('polFile').addEventListener('change', async e => {
  const files = await readFiles(e.target); e.target.value = '';
  for (const f of files) LIB.policies.push({ name: f.name.replace(/\.[^.]+$/, ''), text: f.text });
  saveLib(); renderLib(); if (S.active) renderLive();
  toast(`Added ${files.length} polic${files.length === 1 ? 'y' : 'ies'}.`);
});
$('polAdd').onclick = () => {
  const text = $('polText').value.trim(); if (!text) return toast('Paste some policy text first.');
  LIB.policies.push({ name: $('polName').value.trim() || 'Policy ' + (LIB.policies.length + 1), text });
  $('polText').value = ''; $('polName').value = '';
  saveLib(); renderLib(); if (S.active) renderLive(); toast('Policy added.');
};
$('logFile').addEventListener('change', async e => { const files = await readFiles(e.target); e.target.value = ''; LOGS.push(...files); renderLib() });
$('lib').addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.rmpol != null) { LIB.policies.splice(+t.dataset.rmpol, 1); saveLib(); renderLib(); if (S.active) renderLive() }
  if (t.dataset.rmlog != null) { LOGS.splice(+t.dataset.rmlog, 1); renderLib() }
  if (t.dataset.rmcust != null) { LIB.custom.splice(+t.dataset.rmcust, 1); if (!LIB.custom.length) LIB.onlyCustom = false; saveLib(); rebuildPool(); renderLib(); renderRecord() }
});
$('genBtn').onclick = () => {
  const p = buildPrompt();
  $('genText').value = p; $('genOut').hidden = false;
  if (p.length > 150000) toast('That prompt is very long. Consider fewer or shorter call logs.');
};
$('genCopy').onclick = async () => {
  try { await navigator.clipboard.writeText($('genText').value); toast('Prompt copied.') }
  catch { $('genText').select(); toast('Press Ctrl+C to copy the selected prompt.') }
};
$('impBtn').onclick = () => { const t = $('impText').value.trim(); if (t) importScenarios(t); else msg('impMsg', 'Paste scenario JSON first.', false) };
$('impFile').addEventListener('change', async e => { const files = await readFiles(e.target); e.target.value = ''; for (const f of files) importScenarios(f.text) });
$('onlyCustom').addEventListener('change', e => { LIB.onlyCustom = e.target.checked; saveLib(); rebuildPool(); renderRecord() });
$('custExport').onclick = () => download('signal-desk-scenarios.json', LIB.custom.map(s => ({ ...s, id: String(s.id).replace(/^c_/, '') })));
$('trainee').addEventListener('input', e => { S.trainee = e.target.value.trim(); renderRecord(); save() });
$('saveFile').onclick = () => {
  save();
  download(`signal-desk-${slug(S.trainee)}-${new Date().toISOString().slice(0, 10)}.json`,
    { app: 'signal-desk', kind: 'progress', version: 2, trainee: S.trainee, savedAt: new Date().toISOString(), state: S });
  msg('saveMsg', 'Progress file saved to your downloads.', true);
};
$('loadFile').addEventListener('change', async e => {
  const [f] = await readFiles(e.target); e.target.value = ''; if (!f) return;
  let data; try { data = JSON.parse(f.text) } catch { return msg('saveMsg', 'That file isn’t a Signal Desk progress file.', false) }
  if (!data || data.app !== 'signal-desk' || data.kind !== 'progress' || !data.state) return msg('saveMsg', 'That file isn’t a Signal Desk progress file.', false);
  S = migrate(data.state); qSig = null; save(); renderAll();
  msg('saveMsg', `Loaded progress${S.trainee ? ' for ' + S.trainee : ''}.`, true);
});

function confirmInline(rowId, text, yesLabel, onYes) {
  const row = $(rowId), orig = row.innerHTML;
  row.innerHTML = `<span>${text}</span><button class="btn" data-no>Cancel</button><button class="btn primary" data-yes>${yesLabel}</button>`;
  row.querySelector('[data-no]').onclick = () => { row.innerHTML = orig; wireRows() };
  row.querySelector('[data-yes]').onclick = () => { row.innerHTML = orig; wireRows(); onYes() };
}
function wireRows() {
  $('resetBtn').onclick = () => confirmInline('resetRow', 'Erase this trainee’s progress?', 'Erase', () => {
    const keep = { set: S.set, trainee: S.trainee }; S = Object.assign(fresh(), keep); qSig = null; save(); renderAll(); toast('Progress erased.');
  });
  $('custClear').onclick = () => confirmInline('custRow', 'Remove all your scenarios?', 'Remove', () => {
    LIB.custom = []; LIB.onlyCustom = false; saveLib(); rebuildPool(); renderLib(); renderRecord(); toast('Custom scenarios removed.');
  });
  $('custExport').onclick = () => download('signal-desk-scenarios.json', LIB.custom.map(s => ({ ...s, id: String(s.id).replace(/^c_/, '') })));
}

// ---------- Glossary: "?" on technical terms in the live call ----------
const GLOSSARY = window.SIGNAL_DESK_GLOSSARY || [];
const GL_BY_ID = new Map(GLOSSARY.map(g => [g.id, g]));
const GL_PATTERNS = GLOSSARY.flatMap(g => g.match.map(m => ({ m, id: g.id, cs: !!g.cs, net: g.net || '' }))).sort((a, b) => b.m.length - a.m.length);
const reEscape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const GL_RE = GL_PATTERNS.length ? new RegExp('(?<![\\w-])(' + GL_PATTERNS.map(p => reEscape(p.m)).join('|') + ')(?![\\w-])', 'gi') : null;
function glossaryId(word, net) {
  const p = GL_PATTERNS.find(p => p.m.toLowerCase() === word.toLowerCase() && (!p.cs || p.m === word) && (!p.net || p.net === net));
  return p && p.id;
}
function markTerms(root, net) {
  if (!GL_RE || !root) return;
  const used = new Set(), nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest('.gl, .tag, .l, h2, .mono, input, textarea, .pol, .hist') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue, frag = document.createDocumentFragment();
    let m, last = 0, changed = false;
    GL_RE.lastIndex = 0;
    while ((m = GL_RE.exec(text))) {
      const id = glossaryId(m[1], net);
      if (!id || used.has(id)) continue;
      used.add(id); changed = true;
      frag.append(text.slice(last, m.index));
      const s = document.createElement('span');
      s.className = 'gl'; s.dataset.term = id; s.tabIndex = 0; s.setAttribute('role', 'button');
      s.setAttribute('aria-label', `${m[1]}: what does this mean?`);
      s.append(m[1]); const i = document.createElement('i'); i.setAttribute('aria-hidden', 'true'); i.textContent = '?'; s.append(i);
      frag.append(s); last = m.index + m[1].length;
    }
    if (changed) { frag.append(text.slice(last)); node.replaceWith(frag) }
  }
}
let termWasPaused = false;
function openTerm(id) {
  const g = GL_BY_ID.get(id); if (!g) return;
  $('termTitle').textContent = g.name;
  $('termWhat').textContent = g.what;
  $('termCsat').textContent = g.csat;
  $('termRangeBox').hidden = !(g.ranges && g.ranges.length);
  $('termRange').innerHTML = (g.ranges || []).map(([k, v, tone]) => `<div class="${esc(tone || '')}"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
  $('termSayBox').hidden = !g.say; $('termSay').textContent = g.say || '';
  if (!$('term').open) {
    termWasPaused = S.paused; S.paused = true; renderControls(); renderQueue();
    $('term').showModal();
  }
}
function closeTerm() {
  if (!$('term').open) return;
  $('term').close();
  S.paused = termWasPaused; renderControls(); renderQueue(); if (!S.active) renderLive();
}
$('termClose').onclick = closeTerm;
$('term').addEventListener('cancel', e => { e.preventDefault(); closeTerm() });
$('term').addEventListener('click', e => { if (e.target === $('term')) closeTerm() });

// ---------- Company knowledge in the library ----------
function renderKb() {
  const groups = {};
  for (const e of LIB.kb || []) (groups[e.src || 'Company FAQ'] ||= []).push(e);
  const pages = LIB.kbPages || [];
  $('kbList').innerHTML = Object.entries(groups).map(([src, list]) =>
    `<li><span>${esc(src)} <span class="sub">· ${list.length} question${list.length === 1 ? '' : 's'}</span></span><button class="x" data-rmkb="${esc(src)}" aria-label="Remove questions from ${esc(src)}">×</button></li>`).join('')
    + (pages.length ? `<li><span>Website reference text <span class="sub">· ${pages.length} page${pages.length === 1 ? '' : 's'}</span></span><button class="x" data-rmpages="1" aria-label="Remove website reference text">×</button></li>` : '')
    || '<li class="sub">None yet. Add your FAQ or website in Setup.</li>';
  $('kbShare').value = S.set.kbShare;
  $('kbShareVal').textContent = S.set.kbShare + '%';
  $('kbClear').disabled = !(LIB.kb || []).length && !pages.length;
  const n = KBPOOL.length, have = (LIB.kb || []).length;
  if (have && have < 4) $('kbShareVal').textContent += ' · add at least 4 questions to start knowledge calls';
  else if (n) $('kbShareVal').textContent += ` · ${n} knowledge calls ready`;
}
$('kbShare').addEventListener('input', e => { S.set.kbShare = +e.target.value; renderKb() });
$('kbShare').addEventListener('change', save);
$('kbList').addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.rmkb != null) LIB.kb = LIB.kb.filter(x => (x.src || 'Company FAQ') !== t.dataset.rmkb);
  else if (t.dataset.rmpages) LIB.kbPages = [];
  else return;
  saveLib(); rebuildPool(); renderKb(); renderRecord(); if (S.active) renderLive();
});

// ---------- Operator setup ----------
let setupFirst = false, setupFound = [], setupPages = [], setupWasPaused = false;
function setSrc(src) {
  $('srcChoices').querySelectorAll('[data-src]').forEach(b => b.setAttribute('aria-pressed', b.dataset.src === src));
  $('faqPane').hidden = src !== 'faq'; $('sitePane').hidden = src !== 'site';
  $('foundBox').hidden = src === 'builtin' || !setupFound.length && !setupPages.length;
}
function setSetupMix(f) { $('setupMix').querySelectorAll('[data-mix]').forEach(b => b.classList.toggle('on', +b.dataset.mix === f)); $('setupMix').dataset.val = f }
function openSetup(first) {
  setupFirst = first; setupFound = []; setupPages = [];
  setupWasPaused = S.paused; S.paused = true; renderControls();
  setSetupMix(S.set.fiber); setSrc('builtin');
  $('setupTrainee').value = S.trainee || '';
  $('siteMsg').textContent = ''; $('siteAlt').hidden = true; $('faqText').value = ''; $('siteJson').value = '';
  $('setupCancel').textContent = first ? 'Skip for now' : 'Cancel';
  $('setupNote').textContent = (LIB.kb || []).length ? `${LIB.kb.length} company questions already loaded.` : '';
  $('setup').showModal();
}
function closeSetup() {
  if (setupFirst) { LIB.setupDone = true; saveLib() }
  S.paused = setupWasPaused; renderControls(); renderQueue(); if (!S.active) renderLive();
  if ($('setup').open) $('setup').close();
}
function addFound(result) {
  const have = new Set(setupFound.map(e => e.q.toLowerCase()).concat((LIB.kb || []).map(e => e.q.toLowerCase())));
  let added = 0;
  for (const e of result.faq || []) if (!have.has(e.q.toLowerCase())) { have.add(e.q.toLowerCase()); setupFound.push({ ...e, on: e.relevant }); added++ }
  setupPages.push(...(result.pages || []));
  renderFound();
  return added;
}
function renderFound() {
  const rel = setupFound.filter(e => e.relevant).length;
  $('foundBox').hidden = !setupFound.length && !setupPages.length;
  $('foundSum').textContent = `${setupFound.length} question${setupFound.length === 1 ? '' : 's'} found · ${rel} look relevant to CSRs`
    + (setupPages.length ? ` · ${setupPages.length} reference page${setupPages.length === 1 ? '' : 's'}` : '');
  $('foundList').innerHTML = setupFound.map((e, i) => `<label><input type="checkbox" data-f="${i}" ${e.on ? 'checked' : ''}>
    <span>${esc(e.q)}<span class="a">${esc(e.a.length > 160 ? e.a.slice(0, 160) + '…' : e.a)}</span><span class="why">${e.relevant ? esc(e.cat) : 'Probably not needed by CSRs'}</span></span></label>`).join('')
    || '<p class="sub">No question-and-answer pairs found. Reference pages will still be searchable during calls.</p>';
  updateStartLabel();
}
function updateStartLabel() {
  const n = setupFound.filter(e => e.on).length;
  $('setupStart').textContent = n ? `Add ${n} question${n === 1 ? '' : 's'} and start` : 'Start training';
}
async function parseFiles(input) {
  const files = await readFiles(input); input.value = '';
  let added = 0;
  for (const f of files) added += addFound(Knowledge.parse(f.text, f.name));
  return { files: files.length, added };
}

$('setupBtn').onclick = () => openSetup(false);
$('kbSetup').onclick = () => openSetup(false);
$('kbClear').onclick = () => { LIB.kb = []; LIB.kbPages = []; saveLib(); rebuildPool(); renderKb(); renderRecord(); toast('Company knowledge removed.') };
$('srcChoices').addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (b) setSrc(b.dataset.src) });
$('setupMix').addEventListener('click', e => { const b = e.target.closest('[data-mix]'); if (b) setSetupMix(+b.dataset.mix) });
$('faqFile').addEventListener('change', async e => { const r = await parseFiles(e.target); toast(`Found ${r.added} new question${r.added === 1 ? '' : 's'} in ${r.files} file${r.files === 1 ? '' : 's'}.`) });
$('faqParse').onclick = () => {
  const t = $('faqText').value.trim(); if (!t) return toast('Paste your FAQ first.');
  const n = addFound(Knowledge.parse(t, 'Pasted FAQ'));
  toast(n ? `Found ${n} new question${n === 1 ? '' : 's'}.` : 'No questions found. Make sure each question ends with a question mark.');
};
$('siteUrl').addEventListener('input', () => { $('scrapeCmd').textContent = 'python tools/scrape_site.py ' + ($('siteUrl').value.trim() || 'https://www.your-isp.com') });
$('siteFetch').onclick = async () => {
  let url = $('siteUrl').value.trim(); if (!url) return msg('siteMsg', 'Enter your website address first.', false);
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url) } catch { return msg('siteMsg', 'That doesn’t look like a web address.', false) }
  $('siteFetch').disabled = true; msg('siteMsg', 'Reading ' + url + '…', true);
  const r = await Knowledge.readSite(url, m => msg('siteMsg', m, true));
  $('siteFetch').disabled = false;
  if (r.blocked) { msg('siteMsg', 'This website doesn’t allow other pages to read it directly. Use one of the options below.', false); $('siteAlt').hidden = false; return }
  const n = addFound(r);
  msg('siteMsg', `Read the site: ${n} question${n === 1 ? '' : 's'} and ${r.pages.length} reference page${r.pages.length === 1 ? '' : 's'} found.`, n > 0 || r.pages.length > 0);
  if (!n) $('siteAlt').hidden = false;
};
$('cmdCopy').onclick = async () => { try { await navigator.clipboard.writeText($('scrapeCmd').textContent); toast('Command copied.') } catch { toast('Select the command and copy it.') } };
$('sitePrompt').onclick = async () => {
  const p = Knowledge.sitePrompt($('siteUrl').value.trim() || 'https://www.your-isp.com');
  try { await navigator.clipboard.writeText(p); toast('Prompt copied. Paste it into Claude.') } catch { $('siteJson').value = p; $('siteJson').select(); toast('Copy the selected prompt.') }
};
$('siteFile').addEventListener('change', async e => { const r = await parseFiles(e.target); toast(`Found ${r.added} new question${r.added === 1 ? '' : 's'}.`) });
$('siteParse').onclick = () => {
  const t = $('siteJson').value.trim(); if (!t) return toast('Paste the JSON first.');
  const n = addFound(Knowledge.parse(t, $('siteUrl').value.trim() || 'Website'));
  toast(`Found ${n} new question${n === 1 ? '' : 's'}.`);
};
$('foundList').addEventListener('change', e => { const i = e.target.dataset.f; if (i != null) { setupFound[+i].on = e.target.checked; updateStartLabel() } });
$('selRel').onclick = () => { setupFound.forEach(e => e.on = e.relevant); renderFound() };
$('selNone').onclick = () => { setupFound.forEach(e => e.on = false); renderFound() };
$('setupCancel').onclick = closeSetup;
$('setup').addEventListener('cancel', e => { e.preventDefault(); closeSetup() });
$('setupStart').onclick = () => {
  S.set.fiber = +($('setupMix').dataset.val ?? S.set.fiber);
  S.trainee = $('setupTrainee').value.trim();
  const picked = setupFound.filter(e => e.on).map(({ on, relevant, ...e }) => e);
  LIB.kb = (LIB.kb || []).concat(picked);
  if (setupPages.length) {
    const seen = new Set((LIB.kbPages || []).map(p => p.url + '|' + p.title));
    LIB.kbPages = (LIB.kbPages || []).concat(setupPages.filter(p => !seen.has(p.url + '|' + p.title)));
    let total = 0; LIB.kbPages = LIB.kbPages.filter(p => (total += p.text.length) < 300000);
  }
  LIB.setupDone = true; saveLib(); rebuildPool();
  setupFirst = false; closeSetup(); renderAll(); save();
  if (picked.length) toast(`Added ${picked.length} questions. About ${S.set.kbShare}% of coaching calls will be knowledge calls.`);
};

// ---------- Boot ----------
function renderAll() { renderStats(); renderControls(); renderQueue(); renderLive(); renderLog(); updateShop(); renderRecord(); renderLib(); renderKb() }
function start() {
  S = migrate(load());
  if (!S.log.length) log('<b>Shift started.</b> Your first site is live with 30 subscribers.');
  buildShop(); wireRows(); renderAll();
  if (!LIB.setupDone) openSetup(true);
  let last = performance.now(), saveT = 0;
  setInterval(() => {
    const now = performance.now(), dt = Math.min(5, (now - last) / 1000); last = now;
    tick(dt); renderStats(); renderQueue(); updateShop();
    if ((saveT += dt) > 5) { saveT = 0; save() }
  }, 250);
  setInterval(() => { if (!document.hidden) renderControls() }, 2000);
  requestAnimationFrame(draw);
}
start();
addEventListener('visibilitychange', () => { if (document.hidden) save() });
