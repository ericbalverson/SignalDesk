#!/usr/bin/env python3
"""Pull CSR-relevant content from an ISP website into a Signal Desk knowledge file.

Usage:
    python tools/scrape_site.py https://www.your-isp.com
    python tools/scrape_site.py https://www.your-isp.com --max-pages 60 --out my-site.json

Reads pages a support rep would use (FAQ, support, billing, plans, installation, outages,
policies, contact) and skips careers, press, blog and similar pages. Stays on the same
site, follows robots.txt and pauses between requests. Only standard-library Python 3.8+.

Upload the resulting JSON file in Signal Desk: Setup -> Use our website.
Only scrape sites you own or have permission to use.
"""
import argparse
import heapq
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser

USER_AGENT = "SignalDeskScraper/1.0 (CSR training content)"

CATS = {
    "Billing": ["bill", "billing", "invoice", "payment", "pay ", "autopay", "auto-pay", "charge", "refund", "credit", "late fee", "prorat", "due date", "balance", "card"],
    "Plans": ["plan", "pricing", "price", "package", "speed tier", "mbps", "gbps", "upgrade", "downgrade", "contract", "promotion", "discount", "data cap", "unlimited", "static ip", "business"],
    "Installation": ["install", "appointment", "technician", "site survey", "drop", "mount", "antenna", "dish", "ont", "equipment", "router", "modem", "cpe", "wi-fi", "wifi", "mesh"],
    "Service": ["outage", "down", "slow", "speed", "latency", "weather", "maintenance", "status", "reboot", "restart", "troubleshoot", "signal", "fiber", "wireless", "tower", "coverage", "availability", "available"],
    "Account": ["account", "password", "email", "login", "log in", "portal", "cancel", "move", "moving", "transfer", "authorized", "verify", "privacy", "terms", "policy", "acceptable use"],
    "Support": ["support", "contact", "hours", "phone", "call us", "chat", "help", "ticket", "emergency"],
}
SKIP = ["career", "job opening", "we're hiring", "we are hiring", "investor", "press release", "newsroom", "our team",
        "leadership", "board of directors", "cookie", "blog", "webinar", "case study", "testimonial"]
LINK_WORDS = ["faq", "support", "help", "billing", "pay", "plan", "pricing", "internet", "service", "outage", "status",
              "install", "contact", "terms", "policy", "coverage", "residential", "business", "equipment", "fiber",
              "wireless", "question", "troubleshoot", "account"]
SKIP_PATHS = ["career", "job", "investor", "press", "news", "blog", "team", "leadership", "webinar", "case-stud",
              "login", "signin", "sign-in", "cart", "checkout", "wp-admin", "tag/", "author/", "feed"]
BINARY = re.compile(r"\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|mov|docx?|xlsx?|pptx?|ico|css|js|xml)(\?|$)", re.I)

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
DROP = {"style", "noscript", "svg", "nav", "footer", "form", "iframe", "template"}
BLOCK = {"p", "div", "li", "dd", "dt", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "br", "summary", "details", "ul", "ol"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs or {}), [], parent

    def text(self):
        out = []

        def walk(n):
            for c in n.children:
                if isinstance(c, str):
                    out.append(c)
                else:
                    if c.tag in BLOCK:
                        out.append("\n")
                    walk(c)
                    if c.tag in BLOCK:
                        out.append("\n")
        walk(self)
        return clean("".join(out))

    def elements(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.elements()

    def element_children(self):
        return [c for c in self.children if isinstance(c, Node)]

    def next_element(self):
        if not self.parent:
            return None
        sibs = self.parent.element_children()
        i = sibs.index(self)
        return sibs[i + 1] if i + 1 < len(sibs) else None


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.cur = self.root
        self.skip_depth = 0
        self.jsonld = []
        self._script = None
        self.links = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag == "script":
            self._script = [] if (a.get("type") or "").lower() == "application/ld+json" else None
            self.skip_depth += 1
            return
        if self.skip_depth or tag in DROP:
            if tag not in VOID:
                self.skip_depth += 1
            return
        node = Node(tag, a, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_endtag(self, tag):
        if tag == "script":
            if self._script is not None:
                self.jsonld.append("".join(self._script))
            self._script = None
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth:
            self.skip_depth -= 1
            return
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        if self._script is not None:
            self._script.append(data)
        elif not self.skip_depth:
            self.cur.children.append(data)


def clean(s):
    s = (s or "").replace(" ", " ")
    s = re.sub(r"[ \t\r\f\v]+", " ", s)
    s = re.sub(r"\s*\n\s*", "\n", s)
    return s.strip()


def one_line(s):
    return re.sub(r"\s+", " ", clean(s))


def score(text):
    t = " " + text.lower() + " "
    if any(k in t for k in SKIP):
        return -1, "Other"
    best, best_n, total = "Other", 0, 0
    for cat, words in CATS.items():
        n = sum(1 for w in words if w in t)
        total += n
        if n > best_n:
            best, best_n = cat, n
    return total, best


def entry(q, a, url):
    q = re.sub(r"^(q(uestion)?\s*[:.)-]\s*)", "", one_line(q), flags=re.I)
    a = re.sub(r"^(a(nswer)?\s*[:.)-]\s*)", "", clean(a), flags=re.I)
    if not (8 <= len(q) <= 300) or len(a) < 12:
        return None
    s, cat = score(q + " " + a)
    if s <= 0:
        return None
    return {"q": q, "a": a[:1500], "url": url, "category": cat}


def faq_from_jsonld(blobs, url):
    out = []

    def walk(n):
        if isinstance(n, list):
            for x in n:
                walk(x)
        elif isinstance(n, dict):
            types = n.get("@type")
            types = types if isinstance(types, list) else [types]
            if "Question" in types and n.get("acceptedAnswer"):
                ans = n["acceptedAnswer"]
                ans = ans[0] if isinstance(ans, list) else ans
                text = re.sub(r"<[^>]+>", " ", (ans or {}).get("text", ""))
                out.append(entry(n.get("name", ""), text, url))
            for v in n.values():
                walk(v)
    for b in blobs:
        try:
            walk(json.loads(b))
        except ValueError:
            pass
    return out


QUESTION_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "dt", "button", "strong", "b", "summary"}


def faq_from_tree(root, url):
    out = []
    for el in root.elements():
        if el.tag == "details":
            summ = next((c for c in el.element_children() if c.tag == "summary"), None)
            if summ:
                q = summ.text()
                rest = "\n".join(c.text() if isinstance(c, Node) else c for c in el.children if c is not summ)
                out.append(entry(q, rest, url))
            continue
        if el.tag not in QUESTION_TAGS and "question" not in (el.attrs.get("class") or "").lower():
            continue
        q = one_line(el.text())
        if not q.endswith("?") or len(q) > 300 or el.tag == "summary":
            continue
        node = el
        if not el.element_children() and el.parent and len(el.parent.element_children()) == 1 and not re.match(r"h\d", el.tag):
            node = el.parent
        parts, sib = [], node.next_element()
        while sib is not None and len(" ".join(parts)) < 1200:
            t = sib.text()
            if re.match(r"h[1-6]$", sib.tag) or sib.tag in ("dt", "details") or (one_line(t).endswith("?") and len(t) < 300):
                break
            parts.append(t)
            sib = sib.next_element()
        out.append(entry(q, "\n".join(parts), url))
    return out


def reference_text(root):
    seen, paras = set(), []
    for el in root.elements():
        if el.tag in ("p", "li"):
            t = one_line(el.text())
            if len(t) > 40 and t not in seen and score(t)[0] > 0:
                seen.add(t)
                paras.append(t)
    return "\n\n".join(paras[:60])[:20000]


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if "html" not in (r.headers.get("Content-Type") or "html"):
            return None, r.geturl()
        charset = r.headers.get_content_charset() or "utf-8"
        return r.read(3_000_000).decode(charset, errors="replace"), r.geturl()


def link_score(url, text=""):
    s = (url + " " + text).lower()
    path = urllib.parse.urlparse(url).path.lower()
    if any(p in path for p in SKIP_PATHS):
        return -1
    return sum(1 for w in LINK_WORDS if w in s)


def main():
    ap = argparse.ArgumentParser(description="Pull CSR-relevant content from an ISP website for Signal Desk.")
    ap.add_argument("url", help="Website to read, e.g. https://www.your-isp.com")
    ap.add_argument("--max-pages", type=int, default=40, help="Most pages to read (default 40)")
    ap.add_argument("--delay", type=float, default=0.75, help="Seconds to wait between requests (default 0.75)")
    ap.add_argument("--out", default="site-content.json", help="Output file (default site-content.json)")
    args = ap.parse_args()

    start = args.url if re.match(r"https?://", args.url, re.I) else "https://" + args.url
    host = urllib.parse.urlparse(start).netloc

    robots = urllib.robotparser.RobotFileParser()
    robots.set_url(urllib.parse.urljoin(start, "/robots.txt"))
    try:
        robots.read()
    except (urllib.error.URLError, OSError):
        robots = None

    def allowed(u):
        return robots is None or robots.can_fetch(USER_AGENT, u)

    # Common support pages first, then whatever the site links to, best matches first
    queue, seen = [], set()

    def push(u, prio):
        u = u.split("#")[0]
        if u in seen or urllib.parse.urlparse(u).netloc != host or BINARY.search(u):
            return
        seen.add(u)
        heapq.heappush(queue, (-prio, len(seen), u))

    push(start, 100)
    for guess in ("/faq", "/faqs", "/support", "/help", "/billing", "/plans", "/pricing", "/contact"):
        push(urllib.parse.urljoin(start, guess), 3)

    faq, pages, read = [], [], 0
    while queue and read < args.max_pages:
        _, _, url = heapq.heappop(queue)
        if not allowed(url):
            print(f"  skip (robots.txt) {url}")
            continue
        try:
            html, final = fetch(url)
        except (urllib.error.URLError, OSError, ValueError) as e:
            if url != start:
                continue
            sys.exit(f"Could not read {url}: {e}")
        read += 1
        if not html:
            continue
        tb = TreeBuilder()
        try:
            tb.feed(html)
        except Exception:  # malformed markup: keep what parsed
            pass
        title_node = next((n for n in tb.root.elements() if n.tag == "title"), None)
        title = one_line(title_node.text()) if title_node else final
        found = [e for e in faq_from_jsonld(tb.jsonld, final) + faq_from_tree(tb.root, final) if e]
        faq.extend(found)
        text = reference_text(tb.root)
        if text:
            pages.append({"title": title, "url": final, "text": text})
        print(f"  read {final}  ({len(found)} questions)")
        for href in tb.links:
            try:
                u = urllib.parse.urljoin(final, href)
            except ValueError:
                continue
            if u.startswith("http"):
                s = link_score(u)
                if s > 0:
                    push(u, s)
        time.sleep(args.delay)

    uniq, keys = [], set()
    for e in faq:
        k = re.sub(r"[^a-z0-9 ]", "", e["q"].lower())
        if k not in keys:
            keys.add(k)
            uniq.append(e)

    out = {"app": "signal-desk", "kind": "knowledge", "source": start,
           "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "faq": uniq, "pages": pages}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print(f"\nRead {read} pages: {len(uniq)} questions and {len(pages)} reference pages.")
    print(f"Saved {args.out}. Upload it in Signal Desk under Setup -> Use our website.")


if __name__ == "__main__":
    main()
