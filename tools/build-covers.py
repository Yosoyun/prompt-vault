#!/usr/bin/env python3
"""Generate premium Gumroad cover HTML (1600x900) for each pack → Chrome screenshots to PNG."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT  = ROOT / "product" / "packs"
OUT.mkdir(parents=True, exist_ok=True)

def cover(fname, badge, title_html, sub, foot):
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400;0,9..144,600&family=DM+Mono:wght@400;500&family=Outfit:wght@400;600;700&display=swap');
    *{{margin:0;box-sizing:border-box}}
    html,body{{width:1600px;height:900px}}
    body{{background:#100f0c;position:relative;overflow:hidden;font-family:'Outfit',sans-serif;
      display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;
      -webkit-print-color-adjust:exact;print-color-adjust:exact}}
    .glow{{position:absolute;width:1100px;height:1100px;border-radius:50%;top:-360px;left:50%;
      transform:translateX(-50%);background:radial-gradient(circle,rgba(196,158,63,.22),transparent 62%)}}
    .glow2{{position:absolute;width:800px;height:800px;border-radius:50%;bottom:-360px;right:-160px;
      background:radial-gradient(circle,rgba(196,158,63,.10),transparent 62%)}}
    .frame{{position:absolute;inset:34px;border:1px solid rgba(196,158,63,.28);border-radius:10px}}
    .mark{{font-weight:800;font-size:22px;letter-spacing:.24em;color:#c49e3f;z-index:2}}
    .mark b{{color:#efe7d4}}
    .badge{{z-index:2;margin:34px 0 6px;font-family:'DM Mono',monospace;font-size:15px;letter-spacing:.42em;
      text-transform:uppercase;color:#c49e3f}}
    h1{{z-index:2;font-family:'Fraunces',serif;font-weight:400;color:#f4eeded;font-size:96px;line-height:1.0;
      margin:6px 0 0;color:#f3ecdd;max-width:1200px}}
    h1 em{{font-style:italic;color:#c49e3f}}
    .sub{{z-index:2;font-family:'Fraunces',serif;font-style:italic;font-size:30px;color:#b9ad95;margin-top:26px}}
    .rule{{z-index:2;width:64px;height:2px;background:#c49e3f;margin:34px 0}}
    .foot{{z-index:2;font-family:'DM Mono',monospace;font-size:16px;letter-spacing:.22em;text-transform:uppercase;color:#8f8672}}
    </style></head><body>
      <div class="glow"></div><div class="glow2"></div><div class="frame"></div>
      <div class="mark">&gt;| PRO<b>PROMPT</b></div>
      <div class="badge">{badge}</div>
      <h1>{title_html}</h1>
      <div class="sub">{sub}</div>
      <div class="rule"></div>
      <div class="foot">{foot}</div>
    </body></html>"""
    p = OUT / fname
    p.write_text(html, encoding="utf-8")
    return p

cover("cover-war-room.html", "50 operator-grade prompts",
      "The Founder&rsquo;s <em>War&nbsp;Room</em>",
      "For the decisions that move a company.",
      "never published · getproprompt.com")
cover("cover-field-kit.html", "12 free prompts",
      "The Operator&rsquo;s <em>Field&nbsp;Kit</em>",
      "A taste of the vault.",
      "free · getproprompt.com")
print("wrote cover HTML → product/packs/")
