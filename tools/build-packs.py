#!/usr/bin/env python3
"""Build the demand-test packs as premium print-ready HTML (→ Chrome headless PDF).
   FREE lead magnet  : The Operator's Field Kit (12 prompts, taste of the vault)
   PAID product ($27): The Founder's War Room (50 never-public operator prompts)
"""
import json, html, re, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT  = ROOT / "product" / "packs"
OUT.mkdir(parents=True, exist_ok=True)

def esc(s): return html.escape(str(s or ""))

def hl_vars(body):
    """Escape body, then highlight [VARIABLE] / {VARIABLE} tokens."""
    b = esc(body)
    b = re.sub(r'(\[[A-Z0-9 _/\-]{2,40}\])', r'<span class="v">\1</span>', b)
    b = re.sub(r'(\{[A-Z0-9 _/\-]{2,40}\})', r'<span class="v">\1</span>', b)
    return b

CSS = """
@page { size: A4; margin: 20mm 18mm 22mm; }
* { box-sizing: border-box; }
body { font-family: Georgia,'Times New Roman',serif; color:#1a1712; margin:0;
       -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.gold { color:#9a7b25; }
.eyebrow { font-family:'Helvetica Neue',Arial,sans-serif; font-size:9px; letter-spacing:.28em;
           text-transform:uppercase; color:#9a7b25; font-weight:700; }
/* cover */
.cover { height:238mm; display:flex; flex-direction:column; justify-content:center;
         page-break-after:always; text-align:center; padding:0 6mm; }
.mark { font-family:'Helvetica Neue',Arial,sans-serif; font-weight:800; font-size:13px;
        letter-spacing:.2em; color:#9a7b25; }
.mark b { color:#1a1712; }
.cover h1 { font-size:44px; line-height:1.05; margin:26px 0 10px; font-weight:400; }
.cover h1 em { font-style:italic; color:#9a7b25; }
.cover .sub { font-size:15px; color:#5b544a; font-style:italic; max-width:118mm; margin:0 auto 30px; }
.rule { width:54px; height:2px; background:#9a7b25; margin:22px auto; }
.cover .meta { font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:.14em;
               text-transform:uppercase; color:#8a8175; }
.count { font-size:64px; color:#9a7b25; font-weight:400; line-height:1; margin:8px 0 2px; }
/* intro */
.intro { page-break-after:always; padding-top:6mm; }
.intro h2 { font-size:24px; font-weight:400; margin:0 0 4px; }
.intro p { font-size:12.5px; line-height:1.65; color:#39342c; max-width:150mm; }
.intro .how { background:#faf6ec; border:1px solid #e7dcc2; border-radius:8px; padding:16px 18px; margin:18px 0; }
.intro .how h3 { font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:.2em;
                 text-transform:uppercase; color:#9a7b25; margin:0 0 10px; }
.intro ol { margin:0; padding-left:18px; }
.intro li { font-size:12px; line-height:1.6; margin-bottom:6px; }
/* prompt */
.p { page-break-inside:avoid; padding:14px 0 8px; border-top:1px solid #ece4d3; margin-top:16px; }
.p:first-of-type { border-top:none; }
.p .num { font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; color:#b6ab97; letter-spacing:.1em; }
.p h3 { font-size:19px; font-weight:400; margin:4px 0 6px; line-height:1.15; }
.p .teaser { font-size:12px; font-style:italic; color:#6a6357; margin:0 0 10px; line-height:1.5; }
.p .use { font-family:'Helvetica Neue',Arial,sans-serif; font-size:9.5px; color:#8a8175; margin:0 0 8px; }
.p .use b { color:#9a7b25; }
.box { background:#fbfaf6; border:1px solid #e7dcc2; border-left:3px solid #9a7b25; border-radius:6px;
       padding:14px 16px; font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:10px;
       line-height:1.6; white-space:pre-wrap; color:#2a251d; }
.box .v { background:#f3e7c4; color:#7a5f10; border-radius:3px; padding:0 3px; font-weight:600; }
/* section divider */
.section { page-break-before:always; padding-top:40mm; text-align:center; }
.section .eyebrow { font-size:11px; }
.section h2 { font-size:30px; font-weight:400; margin:8px 0 0; }
.footer-note { text-align:center; font-family:'Helvetica Neue',Arial,sans-serif; font-size:9px;
               color:#b6ab97; letter-spacing:.14em; text-transform:uppercase; margin-top:30px;
               page-break-before:avoid; }
.sig { font-family:Georgia,serif; font-style:italic; }
"""

def prompt_block(i, p, bodykey="body"):
    variables = p.get("variables") or []
    if isinstance(variables, list): varline = ", ".join(variables[:8])
    else: varline = str(variables)
    use = f'<div class="use"><b>Fill in:</b> {esc(varline)}</div>' if varline else ""
    cat = esc(p.get("category") or p.get("c") or "")
    return f"""
    <div class="p">
      <div class="num">{i:02d} &middot; <span class="eyebrow">{cat}</span></div>
      <h3>{esc(p.get('title') or p.get('t'))}</h3>
      <div class="teaser">{esc(p.get('teaser') or p.get('te'))}</div>
      {use}
      <div class="box">{hl_vars(p.get(bodykey) or p.get('b') or '')}</div>
    </div>"""

def render(title_html, subtitle, count, edition, intro_html, prompts, bodykey="body"):
    blocks = "".join(prompt_block(i+1, p, bodykey) for i, p in enumerate(prompts))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
    <section class="cover">
      <div class="mark">&gt;| PRO<b>PROMPT</b></div>
      <div class="count">{count}</div>
      <div class="eyebrow">hand-built prompts</div>
      <h1>{title_html}</h1>
      <div class="sub">{esc(subtitle)}</div>
      <div class="rule"></div>
      <div class="meta">{esc(edition)} &nbsp;·&nbsp; getproprompt.com</div>
    </section>
    <section class="intro">{intro_html}</section>
    {blocks}
    <div class="footer-note">© ProPrompt · getproprompt.com · <span class="sig">crafted by Indrajeet Yadav</span></div>
    </body></html>"""

# ---------------- PAID: The Founder's War Room ----------------
war = json.load(open(ROOT/"product"/"war-room.json"))
# spread across categories: take a balanced 50
from collections import defaultdict, OrderedDict
bycat = OrderedDict()
for p in war: bycat.setdefault(p.get("category","Other"), []).append(p)
paid = []
# round-robin across categories until 50
while len(paid) < 50 and any(bycat.values()):
    for c in list(bycat.keys()):
        if bycat[c]:
            paid.append(bycat[c].pop(0))
            if len(paid) >= 50: break
paid_intro = """
  <div class="eyebrow">The paid edition</div>
  <h2>The Founder&rsquo;s War Room</h2>
  <p>Fifty operator-grade prompts for the decisions that actually move a company &mdash; fundraising narrative,
     pricing, hiring, positioning, crisis, board comms. Each one is engineered like a specialist would run it:
     a role, real constraints, and a defined output. These are <b>not</b> scraped, and they are not published
     anywhere else &mdash; they were written for this edition.</p>
  <div class="how">
    <h3>How to run these</h3>
    <ol>
      <li>Copy one prompt into ChatGPT, Claude, or Gemini.</li>
      <li>Replace every <span style="background:#f3e7c4;color:#7a5f10;border-radius:3px;padding:0 3px;font-weight:600">[HIGHLIGHTED]</span> variable with your real details &mdash; the more specific, the better the output.</li>
      <li>If the first pass is close but not perfect, paste back the weakest section and ask it to sharpen only that.</li>
    </ol>
  </div>
  <p style="font-size:11px;color:#6a6357">One payment. Yours for good. Free updates to this pack. &mdash; getproprompt.com</p>"""
paid_html = render('The Founder&rsquo;s <em>War Room</em>', "Fifty prompts for the decisions that move a company.",
                   "50", "Founding Edition · 2026", paid_intro, paid, "body")
(OUT/"founders-war-room.html").write_text(paid_html, encoding="utf-8")

# ---------------- FREE: The Operator's Field Kit ----------------
genius = json.load(open(ROOT/"product"/"genius120-upgraded.json"))
# pick 12 broadly-useful ones (prefer variety of groups)
seen_g = set(); free = []
for p in genius:
    g = p.get("group") or p.get("category")
    if g in seen_g: continue
    seen_g.add(g); free.append(p)
    if len(free) >= 12: break
for p in genius:                       # top up if not enough distinct groups
    if len(free) >= 12: break
    if p not in free: free.append(p)
free = free[:12]
free_intro = """
  <div class="eyebrow">Free starter kit</div>
  <h2>The Operator&rsquo;s Field Kit</h2>
  <p>Twelve hand-built prompts to feel the difference between a scraped one-liner and a real instrument.
     Every one has a role, constraints, and a defined output &mdash; drop in your details and ship the result
     a specialist would charge for. If these earn a place in your workflow, the full vault has 2,700 more.</p>
  <div class="how">
    <h3>How to use</h3>
    <ol>
      <li>Paste a prompt into ChatGPT, Claude, or Gemini.</li>
      <li>Swap each <span style="background:#f3e7c4;color:#7a5f10;border-radius:3px;padding:0 3px;font-weight:600">[VARIABLE]</span> for your specifics.</li>
      <li>Iterate: hand the weakest part back and ask for a tighter pass.</li>
    </ol>
  </div>
  <p style="font-size:11px;color:#6a6357">Enjoyed these? The Founder&rsquo;s War Room &mdash; 50 never-published operator prompts &mdash; is at getproprompt.com</p>"""
free_html = render('The Operator&rsquo;s <em>Field Kit</em>', "Twelve prompts. A taste of the vault.",
                   "12", "Free Edition · 2026", free_intro, free, "body")
(OUT/"operators-field-kit.html").write_text(free_html, encoding="utf-8")

print("wrote:")
print(" ", OUT/"founders-war-room.html", f"({len(paid)} prompts)")
print(" ", OUT/"operators-field-kit.html", f"({len(free)} prompts)")
