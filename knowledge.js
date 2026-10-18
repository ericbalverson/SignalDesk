'use strict';
// Signal Desk knowledge import: turns an FAQ file, a saved web page, a scraper JSON file or a live website
// into question/answer entries a CSR would need. Loaded before game.js.

const Knowledge = (() => {
  // Words that suggest content a CSR uses on calls, grouped so entries can be sorted into categories.
  const CATS = {
    Billing: ['bill', 'billing', 'invoice', 'payment', 'pay ', 'autopay', 'auto-pay', 'charge', 'refund', 'credit', 'late fee', 'prorat', 'due date', 'balance', 'card'],
    Plans: ['plan', 'pricing', 'price', 'package', 'speed tier', 'mbps', 'gbps', 'upgrade', 'downgrade', 'contract', 'promotion', 'discount', 'data cap', 'unlimited', 'static ip', 'business'],
    Installation: ['install', 'appointment', 'technician', 'site survey', 'drop', 'mount', 'antenna', 'dish', 'ont', 'equipment', 'router', 'modem', 'cpe', 'wi-fi', 'wifi', 'mesh'],
    Service: ['outage', 'down', 'slow', 'speed', 'latency', 'weather', 'maintenance', 'status', 'reboot', 'restart', 'troubleshoot', 'signal', 'fiber', 'wireless', 'tower', 'coverage', 'availability', 'available'],
    Account: ['account', 'password', 'email', 'login', 'log in', 'portal', 'cancel', 'move', 'moving', 'transfer', 'authorized', 'verify', 'privacy', 'terms', 'policy', 'acceptable use'],
    Support: ['support', 'contact', 'hours', 'phone', 'call us', 'chat', 'help', 'ticket', 'emergency'],
  };
  const SKIP = ['career', 'job opening', 'we’re hiring', 'we are hiring', 'investor', 'press release', 'newsroom', 'our team', 'leadership', 'board of directors', 'cookie', 'blog', 'webinar', 'case study', 'testimonial', 'subscribe to our newsletter'];

  const clean = s => String(s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const oneLine = s => clean(s).replace(/\n+/g, ' ');
  const normQ = q => oneLine(q).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  function score(text) {
    const t = ' ' + String(text).toLowerCase() + ' ';
    if (SKIP.some(k => t.includes(k))) return { score: -1, cat: 'Other' };
    let best = 'Other', bestN = 0, total = 0;
    for (const [cat, words] of Object.entries(CATS)) {
      const n = words.filter(w => t.includes(w)).length;
      total += n; if (n > bestN) { bestN = n; best = cat }
    }
    return { score: total, cat: best };
  }
  function entry(q, a, src) {
    q = oneLine(q).replace(/^(q(uestion)?\s*[:.)-]\s*)/i, ''); a = clean(a).replace(/^(a(nswer)?\s*[:.)-]\s*)/i, '');
    if (q.length < 8 || q.length > 300 || a.length < 12) return null;
    const s = score(q + ' ' + a);
    return { q, a: a.slice(0, 1500), src: src || '', cat: s.cat, relevant: s.score > 0 };
  }
  function dedupe(list) {
    const seen = new Set();
    return list.filter(e => e && !seen.has(normQ(e.q)) && seen.add(normQ(e.q)));
  }

  // ---- Plain text and Markdown: a line ending in "?" starts a question, lines below it are the answer ----
  function fromText(text, src) {
    const out = []; let q = null, a = [];
    const flush = () => { if (q) out.push(entry(q, a.join('\n'), src)); q = null; a = [] };
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.replace(/^\s*(#{1,6}\s*|[-*•]\s+|\d+[.)]\s+|\*\*|__)/, '').replace(/(\*\*|__)\s*$/, '').trim();
      if (/\?\s*$/.test(line) && line.length <= 300 && !/^a(nswer)?\s*[:.)-]/i.test(line)) { flush(); q = line }
      else if (/^\s*#{1,6}\s/.test(raw)) flush(); // a section heading ends the answer above it
      else if (q && line) a.push(line);
      else if (q && !line && a.length && a.join(' ').length > 600) flush();
    }
    flush();
    return out.filter(Boolean);
  }

  // ---- CSV with a question column and an answer column ----
  function parseCsv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c }
      else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row) }
    return rows.filter(r => r.some(x => x.trim()));
  }
  function fromCsv(text, src) {
    const rows = parseCsv(text); if (!rows.length) return [];
    const head = rows[0].map(h => h.toLowerCase());
    let qi = head.findIndex(h => /question|^q$/.test(h)), ai = head.findIndex(h => /answer|^a$|response/.test(h));
    const body = qi >= 0 && ai >= 0 ? rows.slice(1) : rows;
    if (qi < 0 || ai < 0) { qi = 0; ai = 1 }
    return body.map(r => entry(r[qi], r[ai], src)).filter(Boolean);
  }

  // ---- HTML: FAQ schema, <details>, accordions and headings that end in "?" ----
  function textOf(el) { return el ? clean(el.innerText || el.textContent || '') : '' }
  function fromHtml(html, src) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    const title = oneLine((doc.querySelector('title') || {}).textContent || src || 'Web page');
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const walk = n => {
          if (!n || typeof n !== 'object') return;
          if (Array.isArray(n)) return n.forEach(walk);
          const t = [].concat(n['@type'] || []);
          if (t.includes('Question') && n.acceptedAnswer) {
            const ans = [].concat(n.acceptedAnswer)[0];
            const tmp = doc.createElement('div'); tmp.innerHTML = ans && ans.text || '';
            out.push(entry(n.name, textOf(tmp), src));
          }
          Object.values(n).forEach(walk);
        };
        walk(JSON.parse(s.textContent));
      } catch {}
    });
    doc.querySelectorAll('script, style, noscript, svg, nav, footer, form, iframe').forEach(e => e.remove());
    doc.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); if (s) { const q = textOf(s); s.remove(); out.push(entry(q, textOf(d), src)) } });
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6, dt, button, strong, b, [role="button"], .question, [class*="faq"] [class*="question"], [class*="accordion"] [class*="title"]').forEach(el => {
      const q = oneLine(textOf(el));
      if (!/\?$/.test(q) || q.length > 300) return;
      let node = el.children.length === 0 && el.parentElement && el.parentElement.children.length === 1 && !/^H\d$/.test(el.tagName) ? el.parentElement : el;
      const parts = []; let sib = node.nextElementSibling;
      while (sib && parts.join(' ').length < 1200) {
        if (/^H[1-6]$/.test(sib.tagName) || sib.tagName === 'DT' || sib.tagName === 'DETAILS' || (/\?$/.test(oneLine(textOf(sib))) && textOf(sib).length < 300)) break;
        parts.push(textOf(sib)); sib = sib.nextElementSibling;
      }
      if (!parts.join('').trim() && el.tagName === 'DT' && el.nextElementSibling) parts.push(textOf(el.nextElementSibling));
      out.push(entry(q, parts.join('\n'), src));
    });
    // Reference text: paragraphs and list items that look useful to a CSR
    const paras = [...doc.querySelectorAll('main p, main li, article p, article li, p, li')].map(textOf)
      .filter((t, i, a) => t.length > 40 && a.indexOf(t) === i && score(t).score > 0).slice(0, 60);
    const page = paras.length ? { title, url: src || '', text: paras.join('\n\n').slice(0, 20000) } : null;
    return { faq: dedupe(out.filter(Boolean)), pages: page ? [page] : [] };
  }

  // ---- JSON: a knowledge pack from the scraper or Claude, or a plain list of {q, a} ----
  function fromJson(text, src) {
    let data; try { data = JSON.parse(text) } catch {
      const i = text.search(/[[{]/), j = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
      data = JSON.parse(text.slice(i, j + 1));
    }
    const list = Array.isArray(data) ? data : (data.faq || data.questions || []);
    const faq = list.map(x => x && entry(x.q || x.question || x.name, x.a || x.answer || x.text, x.url || data.source || src)).filter(Boolean);
    const pages = (Array.isArray(data.pages) ? data.pages : []).map(p => ({ title: oneLine(p.title || p.url || 'Page'), url: p.url || '', text: clean(p.text).slice(0, 20000) }))
      .filter(p => p.text.length > 40 && score(p.title + ' ' + p.text).score > 0);
    return { faq: dedupe(faq), pages };
  }

  function parse(text, name) {
    const n = String(name || '').toLowerCase(), t = String(text || '').trim();
    if (!t) return { faq: [], pages: [] };
    if (n.endsWith('.json') || /^[[{]/.test(t)) { try { return fromJson(t, name) } catch {} }
    if (/\.html?$/.test(n) || /<(html|body|div|p|h[1-6]|details)[\s>]/i.test(t)) return fromHtml(t, name);
    if (n.endsWith('.csv')) return { faq: dedupe(fromCsv(t, name)), pages: [] };
    return { faq: dedupe(fromText(t, name)), pages: [] };
  }

  // ---- Live website: works only when the site allows cross-site reading (CORS). Most don't. ----
  const LINK_WORDS = ['faq', 'support', 'help', 'billing', 'pay', 'plan', 'pricing', 'internet', 'service', 'outage', 'status', 'install', 'contact', 'terms', 'policy', 'coverage', 'residential', 'business', 'equipment', 'fiber', 'wireless', 'question'];
  async function readSite(url, onProgress) {
    const start = new URL(url);
    const get = async u => { const r = await fetch(u, { credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() };
    let html;
    try { html = await get(start.href) } catch (e) { return { blocked: true, error: String(e.message || e) } }
    const result = { faq: [], pages: [] };
    const add = (r) => { result.faq.push(...r.faq); result.pages.push(...r.pages) };
    add(fromHtml(html, start.href));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = [...doc.querySelectorAll('a[href]')].map(a => { try { return { u: new URL(a.getAttribute('href'), start).href.split('#')[0], t: (a.textContent || '').toLowerCase() } } catch { return null } })
      .filter(l => l && new URL(l.u).host === start.host && !/\.(pdf|jpe?g|png|gif|zip|mp4|svg)$/i.test(l.u))
      .map(l => ({ ...l, s: LINK_WORDS.filter(w => (l.u + ' ' + l.t).toLowerCase().includes(w)).length - (SKIP.some(k => (l.u + ' ' + l.t).toLowerCase().includes(k.split(' ')[0])) ? 5 : 0) }))
      .filter(l => l.s > 0).sort((a, b) => b.s - a.s);
    const seen = new Set([start.href]);
    for (const l of links) {
      if (seen.size > 15) break;
      if (seen.has(l.u)) continue; seen.add(l.u);
      onProgress && onProgress(`Reading ${l.u}`);
      try { add(fromHtml(await get(l.u), l.u)) } catch {}
    }
    result.faq = dedupe(result.faq);
    return result;
  }

  function sitePrompt(url) {
    return `Read the website ${url} and pull out the content a customer service rep (CSR) at this internet service provider would need on calls.

Read pages such as FAQ, support or help, billing and payments, plans and pricing, installation and equipment, outages or network status, terms of service, acceptable use, privacy, contact details and hours, and coverage or availability. Skip careers, investors, press, blog posts, case studies and general marketing.

Return only JSON in this shape, with no commentary:
{
 "app": "signal-desk",
 "kind": "knowledge",
 "source": "${url}",
 "faq": [ { "q": "A question a customer would actually ask", "a": "A short, accurate answer taken from the site", "url": "page it came from" } ],
 "pages": [ { "title": "Page title", "url": "page url", "text": "The CSR-relevant text from that page, in plain sentences" } ]
}

Rules:
- Use only facts stated on the site. Don't invent prices, policies or hours.
- Write 20 to 60 FAQ entries if the site has enough content. Include the site's own FAQ questions, and turn key facts from other pages into questions too.
- Keep each answer to one to three sentences.`;
  }

  // ---- Turn entries into multiple-choice knowledge calls ----
  const short = (a, n = 170) => { const s = oneLine(a); if (s.length <= n) return s; const cut = s.slice(0, n); const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? ')); return (end > 60 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…') };
  const OPENERS = ['', 'Hi, quick question. ', 'I was wondering, '];
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) };
  function toScenarios(entries) {
    const list = entries.filter(e => e.a);
    return list.map((e, i) => {
      if (list.length < 4) return null;
      const others = list.filter(x => x !== e && short(x.a) !== short(e.a));
      const same = others.filter(x => x.cat === e.cat), rest = others.filter(x => x.cat !== e.cat);
      const pickFrom = (arr, n, seed) => arr.map((x, k) => [x, (Math.sin((i + 1) * 99.1 + k * 7.3 + seed) + 1) % 1]).sort((a, b) => a[1] - b[1]).slice(0, n).map(p => p[0]);
      const distract = pickFrom(same, 3, 1); if (distract.length < 3) distract.push(...pickFrom(rest, 3 - distract.length, 2));
      if (distract.length < 3) return null;
      const lower = e.q.charAt(0).toLowerCase() + e.q.slice(1);
      return {
        id: 'kb_' + hash(normQ(e.q)), net: 'any', topic: 'Company FAQ', kind: 'kb', plan: '',
        quotes: OPENERS.map(o => o ? o + lower : e.q),
        data: [['Topic', e.cat], ['Source', e.src || 'Company FAQ']],
        options: [{ t: short(e.a), s: 2, why: 'This is what your company’s FAQ says.' },
          ...distract.map(d => ({ t: short(d.a), s: 0, why: 'This answers a different question: “' + short(d.q, 90) + '”' }))],
        lesson: oneLine(e.q) + ' ' + short(e.a, 400),
      };
    }).filter(Boolean);
  }

  return { parse, readSite, sitePrompt, toScenarios, score };
})();
