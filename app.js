/* ============================================================
   THE PROMPT VAULT — app logic v2
   Vanilla JS · index loads first, bodies lazily · favorites · viral
   ============================================================ */
(() => {
  "use strict";

  const BATCH = 48;
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (n) => n.toLocaleString("en-US");
  const SAVE_KEY = "pv-saved";

  const state = {
    meta: null, index: [], bodies: null, bodiesPromise: null,
    group: "all", category: null, query: "", sort: "default",
    results: [], shown: 0, savedOnly: false,
    groupColor: {}, catLabel: {}, saved: new Set(),
  };

  // Featured one-tap collections (set a search query, optional group)
  const COLLECTIONS = [
    { icon: "💎", label: "Million-dollar",  q: "", group: "elite" },
    { icon: "🧠", label: "Expert picks",    q: "", group: "expert" },
    { icon: "📸", label: "Pro headshots",   q: "headshot" },
    { icon: "🤳", label: "Selfie magic",    q: "selfie" },
    { icon: "🔥", label: "Go viral",        q: "", group: "viral" },
    { icon: "✍️", label: "LinkedIn",        q: "linkedin" },
    { icon: "📕", label: "Write a book",    q: "book" },
    { icon: "🛠️", label: "Prompt generator",q: "", group: "gen" },
    { icon: "✉️", label: "Cold email",      q: "email" },
    { icon: "🎬", label: "YouTube & video", q: "youtube" },
    { icon: "🖼️", label: "Midjourney art",  q: "midjourney" },
    { icon: "📄", label: "Resume & jobs",   q: "resume" },
    { icon: "📊", label: "Excel & data",    q: "excel" },
    { icon: "📚", label: "Learn faster",    q: "learn" },
    { icon: "💻", label: "Code helper",     q: "code" },
  ];

  /* ---------- boot ---------- */
  async function boot() {
    loadSaved();
    try {
      const [meta, index] = await Promise.all([
        fetch("data/meta.json", { cache: "no-cache" }).then((r) => r.json()),
        fetch("data/index.json", { cache: "no-cache" }).then((r) => r.json()),
      ]);
      state.meta = meta; state.index = index;
      meta.groups.forEach((g) => (state.groupColor[g.key] = g.color));
      meta.groups.forEach((g) => g.categories.forEach((c) => (state.catLabel[c.name] = c.label)));
      state.slugMap = {};
      for (const r of index) {
        r._s = (r.t + " " + r.te + " " + (state.catLabel[r.c] || r.c)).toLowerCase();
        const s = slug(r.t); if (!(s in state.slugMap)) state.slugMap[s] = r.i;
      }

      hydrateMeta();
      renderGroups();
      renderCollections();
      renderSearchChips();
      renderPOTD();
      renderRecent();
      renderTrending();
      animateStats();
      applyInitialQuery();
      applyFilters();
      ensureBodies();
      handleDeepLink();
    } catch (err) {
      $("#resultCount").textContent = "";
      $("#grid").innerHTML =
        `<div class="empty" style="grid-column:1/-1;display:block">
           <div class="empty-mark">⚠️</div><h3>Couldn’t load the vault</h3>
           <p>The data needs to be served over http. Run <code>python3 -m http.server</code> here, or open the live site.</p></div>`;
      console.error(err);
    }
  }

  function ensureBodies() {
    if (state.bodies) return Promise.resolve(state.bodies);
    if (!state.bodiesPromise)
      state.bodiesPromise = fetch("data/bodies.json", { cache: "no-cache" }).then((r) => r.json()).then((b) => (state.bodies = b));
    return state.bodiesPromise;
  }

  /* ---------- saved (localStorage) ---------- */
  function loadSaved() {
    try { JSON.parse(localStorage.getItem(SAVE_KEY) || "[]").forEach((i) => state.saved.add(i)); } catch (_) {}
  }
  function persistSaved() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify([...state.saved])); } catch (_) {}
    const n = state.saved.size;
    $("#savedNavN").textContent = n;
    $("#savedToggle").textContent = n ? `★ Saved (${n})` : "★ Saved";
  }
  function toggleSave(i) {
    if (state.saved.has(i)) state.saved.delete(i); else state.saved.add(i);
    persistSaved();
    if (state.savedOnly) applyFilters();
  }

  /* ---------- meta ---------- */
  function hydrateMeta() {
    const total = state.meta.total;
    $("#heroCount").textContent = fmt(total);
    $("#statTotal").textContent = fmt(total);
    const _fc = $("#freeCount"); if (_fc) _fc.textContent = fmt(total);
    $("#statShelves").textContent = state.meta.groups.filter((g) => g.count > 0).length;
    $("#statTopics").textContent = state.meta.groups.reduce((a, g) => a + g.categories.length, 0);
    $("#search").placeholder = `Search ${fmt(total)} prompts — “cold email”, “youtube script”, “midjourney”…`;
    $("#year").textContent = new Date().getFullYear();
    persistSaved();
  }

  /* ---------- group + category chips ---------- */
  function renderGroups() {
    const row = $("#groupRow");
    row.appendChild(chip({ key: "all", label: "All prompts", icon: "✦", count: state.meta.total, color: "var(--accent)" }, true));
    state.meta.groups.forEach((g) => { if (g.count > 0) row.appendChild(chip(g, false)); });
  }
  function chip(g, active) {
    const el = document.createElement("button");
    el.className = "chip" + (active ? " active" : "") + (g.featured ? " featured" : "");
    el.style.setProperty("--c", g.color);
    el.dataset.group = g.key;
    el.innerHTML = `<span class="ico">${g.icon}</span><span>${g.label}</span><span class="n">${fmt(g.count)}</span>`;
    el.addEventListener("click", () => selectGroup(g.key));
    return el;
  }
  function selectGroup(key, keepSearch) {
    state.group = key; state.category = null; state.savedOnly = false;
    syncSavedToggle();
    if (!keepSearch) { /* keep query */ }
    $("#groupRow").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.group === key));
    renderCategoryRow();
    applyFilters();
    document.getElementById("groups").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderCategoryRow() {
    const row = $("#catRow"); row.innerHTML = "";
    if (state.group === "all") { row.hidden = true; return; }
    const g = state.meta.groups.find((x) => x.key === state.group);
    if (!g || !g.categories.length) { row.hidden = true; return; }
    row.hidden = false;
    const mk = (name, label, count, active) => {
      const el = document.createElement("button");
      el.className = "chip" + (active ? " active" : "");
      el.style.setProperty("--c", g.color);
      el.innerHTML = `<span>${label}</span><span class="n">${fmt(count)}</span>`;
      el.addEventListener("click", () => { state.category = active ? null : name; renderCategoryRow(); applyFilters(); });
      return el;
    };
    row.appendChild(mk(null, "All " + g.label, g.count, state.category === null));
    g.categories.forEach((c) => row.appendChild(mk(c.name, c.label, c.count, state.category === c.name)));
  }

  /* ---------- collections ---------- */
  function renderCollections() {
    const row = $("#collRow");
    COLLECTIONS.forEach((c) => {
      if (c.group && !state.meta.groups.some((g) => g.key === c.group && g.count > 0)) return;
      const el = document.createElement("button");
      el.className = "coll-chip";
      el.innerHTML = `<span class="coll-ico">${c.icon}</span><span>${c.label}</span>`;
      el.addEventListener("click", () => {
        state.query = c.q; $("#search").value = c.q; $("#clearSearch").hidden = !c.q;
        if (c.group) selectGroup(c.group, true); else { selectGroup("all", true); }
      });
      row.appendChild(el);
    });
  }

  /* ---------- trending rail ---------- */
  function renderTrending() {
    const viral = state.index.filter((r) => r.g === "viral");
    if (!viral.length) return;
    $("#trending").hidden = false;
    const pick = viral.slice(0, 12);
    const rail = $("#trendRail");
    pick.forEach((r) => {
      const el = document.createElement("article");
      el.className = "trend-card";
      el.innerHTML = `
        <span class="trend-tag">🔥 ${esc(state.catLabel[r.c] || r.c)}</span>
        <h3>${esc(r.t)}</h3>
        <p>${esc(r.te || "")}</p>
        <div class="trend-foot">
          <button class="copy-btn sm" data-i="${r.i}"><span class="ci">⧉</span><span class="ct">Copy</span></button>
          <button class="view-btn sm" data-i="${r.i}">View</button>
        </div>`;
      el.querySelector(".copy-btn").addEventListener("click", (e) => copyPrompt(r.i, e.currentTarget));
      el.querySelector(".view-btn").addEventListener("click", () => openModal(r.i));
      rail.appendChild(el);
    });
    $("#seeViral").addEventListener("click", () => selectGroup("viral", true));
  }

  /* ---------- filtering ---------- */
  function applyFilters() {
    const q = state.query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    let res = state.index.filter((r) => {
      if (state.savedOnly && !state.saved.has(r.i)) return false;
      if (state.group !== "all" && r.g !== state.group) return false;
      if (state.category && r.c !== state.category) return false;
      for (const t of terms) if (!r._s.includes(t)) return false;
      return true;
    });
    switch (state.sort) {
      case "az": res = res.slice().sort((a, b) => a.t.localeCompare(b.t)); break;
      case "short": res = res.slice().sort((a, b) => a.len - b.len); break;
      case "long": res = res.slice().sort((a, b) => b.len - a.len); break;
    }
    state.results = res; state.shown = 0;
    $("#grid").innerHTML = ""; updateCount(); renderMore();
    const none = res.length === 0;
    $("#empty").hidden = !none;
    if (none) $("#emptyTitle").textContent = state.savedOnly ? "No saved prompts yet." : "No prompts match that.";
  }
  function updateCount() {
    const n = state.results.length;
    let scope = "all shelves";
    if (state.savedOnly) scope = "your saved prompts";
    else if (state.group !== "all") {
      const g = state.meta.groups.find((x) => x.key === state.group);
      scope = state.category ? (state.catLabel[state.category] || state.category) : g.label;
    }
    const qpart = state.query.trim() ? ` matching “${state.query.trim()}”` : "";
    $("#resultCount").innerHTML = `<b>${fmt(n)}</b> prompt${n === 1 ? "" : "s"} · ${scope}${qpart}`;
  }
  function renderMore() {
    const frag = document.createDocumentFragment();
    const end = Math.min(state.shown + BATCH, state.results.length);
    for (let k = state.shown; k < end; k++) {
      const el = cardEl(state.results[k]);
      el.style.animationDelay = (((k - state.shown) % 12) * 0.035) + "s"; // staggered motion-in
      frag.appendChild(el);
    }
    $("#grid").appendChild(frag); state.shown = end;
    const lm = $("#loadMore"); lm.hidden = state.shown >= state.results.length;
    if (!lm.hidden) lm.textContent = `Load ${Math.min(BATCH, state.results.length - state.shown)} more · ${fmt(state.results.length - state.shown)} left`;
  }

  /* ---------- card ---------- */
  function cardEl(r) {
    const g = state.meta.groups.find((x) => x.key === r.g);
    const color = g ? g.color : "var(--accent)";
    const isViral = r.g === "viral";
    const el = document.createElement("article");
    el.className = "card" + (isViral ? " viral" : "");
    el.style.setProperty("--c", color);
    const vars = (r.v || []).slice(0, 4).map((v) => `<span class="var-tag">${esc(v)}</span>`).join("");
    const savedCls = state.saved.has(r.i) ? " on" : "";
    el.innerHTML = `
      <button class="fav${savedCls}" data-i="${r.i}" aria-label="Save prompt" title="Save">${state.saved.has(r.i) ? "★" : "☆"}</button>
      <div class="card-top">
        <span class="badge">${g ? g.icon : "✦"} ${g ? g.label : ""}</span>
        ${isViral ? '<span class="new-tag">NEW</span>' : ""}
        <span class="card-cat">${esc(state.catLabel[r.c] || r.c)}</span>
      </div>
      <h3 class="card-title">${esc(r.t)}</h3>
      <p class="card-teaser">${esc(r.te || "Ready-to-use AI prompt. Click view to read the full text.")}</p>
      ${vars ? `<div class="card-vars">${vars}</div>` : ""}
      <div class="card-actions">
        <button class="copy-btn" data-i="${r.i}"><span class="ci">⧉</span> <span class="ct">Copy</span></button>
        <button class="view-btn" data-i="${r.i}">View</button>
      </div>
      <div class="card-foot">${r.cr ? `<a class="card-credit" href="${esc(r.cr.u)}" target="_blank" rel="noopener nofollow">via ${esc(r.cr.n)} ↗</a>` : ""}<span class="card-len">${fmt(r.len)} chars</span></div>`;
    el.querySelector(".fav").addEventListener("click", (e) => { toggleSave(r.i); const b = e.currentTarget; const on = state.saved.has(r.i); b.classList.toggle("on", on); b.textContent = on ? "★" : "☆"; });
    el.querySelector(".copy-btn").addEventListener("click", (e) => copyPrompt(r.i, e.currentTarget));
    el.querySelector(".view-btn").addEventListener("click", () => openModal(r.i));
    return el;
  }

  /* ---------- copy ---------- */
  async function copyPrompt(i, btn) {
    const txt = btn ? btn.querySelector(".ct") : null;
    if (txt) txt.textContent = "…";
    const bodies = await ensureBodies();
    const ok = await toClipboard(bodies[i] ? bodies[i].p : "");
    if (btn) { btn.classList.toggle("done", ok); if (txt) txt.textContent = ok ? "Copied" : "Failed";
      setTimeout(() => { btn.classList.remove("done"); if (txt) txt.textContent = "Copy"; }, 1600); }
    if (ok) { toast(); recordUse(i); confetti(btn); }
  }
  async function toClipboard(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    try { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok; } catch (_) { return false; }
  }
  let toastT;
  function toast(msg) { const t = $("#toast"); if (msg) t.textContent = msg; t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show")); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 1700); }

  /* ---------- modal + live customizer ---------- */
  let modalState = null;
  async function openModal(i) {
    const r = state.index[i];
    modalState = { i, vars: (r.v || []).slice(), values: {}, body: { p: "", h: "" } };
    const g = state.meta.groups.find((x) => x.key === r.g);
    const card = $(".modal-card"); card.style.setProperty("--c", g ? g.color : "var(--accent)");
    $("#mBadge").textContent = `${g ? g.icon : "✦"} ${g ? g.label : ""} · ${state.catLabel[r.c] || r.c}`;
    $("#mTitle").textContent = r.t;
    const creditHTML = r.cr ? ` · <a class="m-credit" href="${esc(r.cr.u)}" target="_blank" rel="noopener nofollow">via ${esc(r.cr.n)} ↗</a>` : "";
    $("#mMeta").innerHTML = `${fmt(r.len)} characters${modalState.vars.length ? ` · ${modalState.vars.length} fill-in${modalState.vars.length > 1 ? "s" : ""}` : ""}${creditHTML}`;
    const _ms = $(".modal-sig"); if (_ms) _ms.style.display = r.cr ? "none" : "";
    const sBtn = $("#mSave"); const syncSave = () => { const on = state.saved.has(i); sBtn.textContent = on ? "★ Saved" : "☆ Save"; sBtn.classList.toggle("on", on); sBtn.setAttribute("aria-pressed", on); };
    syncSave(); sBtn.onclick = () => { toggleSave(i); syncSave(); refreshCardFav(i); };
    $("#mShare").onclick = async () => {
      const url = location.origin + location.pathname + "?p=" + encodeURIComponent(slug(r.t));
      const ok = await toClipboard(url); toast(ok ? "Share link copied 🔗" : "Couldn't copy link");
    };
    try { history.replaceState(null, "", "?p=" + encodeURIComponent(slug(r.t))); } catch (_) {}
    $("#mFill").hidden = true; $("#mFillGrid").innerHTML = "";
    $("#mPrompt").innerHTML = `<span class="sk" style="display:block;height:14px;width:60%;margin:4px 0"></span>`;
    showModal();
    const bodies = await ensureBodies(); const body = bodies[i] || { p: "", h: "" };
    modalState.body = body;
    if (modalState.vars.length) buildFill();
    renderModalPreview();
    const hint = $("#mHint");
    if (body.h) { hint.hidden = false; hint.textContent = "💡 " + body.h; } else hint.hidden = true;
    $("#mCopy").onclick = async (e) => {
      const ok = await toClipboard(computeFilled()); const ct = e.currentTarget.querySelector(".ct");
      e.currentTarget.classList.toggle("done", ok); ct.textContent = ok ? "Copied ✓" : "Copy failed";
      if (ok) { toast(); recordUse(i); confetti(e.currentTarget); }
      setTimeout(() => { e.currentTarget.classList.remove("done"); ct.textContent = "Copy prompt"; }, 1700);
    };
    // run-it-in: copy the filled prompt + open the chosen AI
    document.querySelectorAll(".m-launch .launch-btn").forEach((b) => {
      b.onclick = async () => {
        const text = computeFilled(); await toClipboard(text);
        const enc = encodeURIComponent(text), short = enc.length < 1800, tool = b.dataset.ai;
        const url = tool === "claude" ? (short ? "https://claude.ai/new?q=" + enc : "https://claude.ai/new")
          : tool === "gemini" ? "https://gemini.google.com/app"
          : (short ? "https://chatgpt.com/?q=" + enc : "https://chatgpt.com/");
        window.open(url, "_blank", "noopener");
        toast("Prompt copied — paste into " + tool[0].toUpperCase() + tool.slice(1) + " ✓");
        recordUse(i);
      };
    });
    // social share of the deep link
    document.querySelectorAll(".m-launch .share-ico").forEach((b) => {
      b.onclick = () => {
        const link = location.origin + location.pathname + "?p=" + encodeURIComponent(slug(r.t));
        const text = r.t + " — a free AI prompt from The Prompt Vault";
        const net = b.dataset.share;
        const url = net === "x" ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`
          : net === "linkedin" ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`
          : `https://wa.me/?text=${encodeURIComponent(text + " " + link)}`;
        window.open(url, "_blank", "noopener");
      };
    });
  }
  function buildFill() {
    const grid = $("#mFillGrid"); grid.innerHTML = "";
    modalState.vars.forEach((v) => {
      const name = v.replace(/^\[|\]$/g, "");
      const field = document.createElement("label"); field.className = "fill-field";
      field.innerHTML = `<span>${esc(name)}</span><input type="text" placeholder="your ${esc(name.toLowerCase())}…" autocomplete="off" spellcheck="false">`;
      const input = field.querySelector("input");
      input.addEventListener("input", () => { modalState.values[v] = input.value; renderModalPreview(); });
      grid.appendChild(field);
    });
    $("#mFill").hidden = false;
  }
  function renderModalPreview() {
    const { body, vars, values } = modalState;
    let html = esc(body.p);
    vars.forEach((v) => {
      const safe = esc(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const val = (values[v] || "").trim();
      html = html.replace(new RegExp(safe, "g"), val ? `<mark class="filled">${esc(val)}</mark>` : `<mark>${esc(v)}</mark>`);
    });
    $("#mPrompt").innerHTML = html;
  }
  function computeFilled() {
    const { body, vars, values } = modalState;
    let out = body.p;
    vars.forEach((v) => { const val = (values[v] || "").trim(); if (val) out = out.split(v).join(val); });
    return out;
  }
  function refreshCardFav(i) {
    const b = document.querySelector(`.card .fav[data-i="${i}"]`);
    if (b) { const on = state.saved.has(i); b.classList.toggle("on", on); b.textContent = on ? "★" : "☆"; }
  }
  function highlightVars(text, vars) {
    let html = esc(text);
    (vars || []).forEach((v) => { const safe = esc(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); html = html.replace(new RegExp(safe, "g"), `<mark>${esc(v)}</mark>`); });
    return html;
  }
  function showModal() { $("#modal").hidden = false; document.body.style.overflow = "hidden"; }
  function hideModal() {
    $("#modal").hidden = true; document.body.style.overflow = "";
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  }

  /* ---------- engagement: deep links, recent, POTD, chips, delight ---------- */
  function slug(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50); }

  function recordUse(i) {
    try {
      let rec = JSON.parse(localStorage.getItem("pv-recent") || "[]");
      rec = [i, ...rec.filter((x) => x !== i)].slice(0, 14);
      localStorage.setItem("pv-recent", JSON.stringify(rec));
      const n = (parseInt(localStorage.getItem("pv-copies") || "0", 10) || 0) + 1;
      localStorage.setItem("pv-copies", String(n));
      renderRecent(); milestone(n);
    } catch (_) {}
  }
  function milestone(n) {
    const M = { 1: "First copy! 🎉 Go build something great.", 5: "5 prompts copied 🔥", 10: "10 copies — you're on a roll 🚀", 25: "25 prompts! Certified power user 💪", 50: "50 copies! Legend 🏆", 100: "100 prompts copied 👑" };
    if (M[n]) setTimeout(() => toast(M[n]), 950);
  }
  function renderRecent() {
    let rec; try { rec = JSON.parse(localStorage.getItem("pv-recent") || "[]"); } catch (_) { rec = []; }
    rec = rec.filter((i) => state.index[i]);
    const sec = $("#recent");
    if (!rec.length) { sec.hidden = true; return; }
    sec.hidden = false;
    const copies = parseInt(localStorage.getItem("pv-copies") || "0", 10) || 0;
    sec.querySelector(".sec-head h2").innerHTML = `🕘 Pick up where you left off <span class="recent-count">· ${fmt(copies)} copied</span>`;
    const rail = $("#recentRail"); rail.innerHTML = "";
    rec.forEach((i) => {
      const r = state.index[i]; const g = state.meta.groups.find((x) => x.key === r.g);
      const el = document.createElement("button"); el.className = "recent-card"; el.style.setProperty("--c", g ? g.color : "var(--accent)");
      el.innerHTML = `<span class="rc-badge">${g ? g.icon : "✦"}</span><span class="rc-title">${esc(r.t)}</span>`;
      el.addEventListener("click", () => openModal(i));
      rail.appendChild(el);
    });
  }
  function renderPOTD() {
    if (!state.index.length) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    const seed = now.getFullYear() * 1000 + dayOfYear;
    const pool = state.index.filter((r) => ["elite", "expert", "viral", "image"].includes(r.g));
    const arr = pool.length ? pool : state.index;
    const r = arr[seed % arr.length];
    const g = state.meta.groups.find((x) => x.key === r.g);
    $("#potd").style.setProperty("--c", g ? g.color : "var(--accent)");
    $("#potdBadge").textContent = `${g ? g.icon : "✦"} ${g ? g.label : ""}`;
    $("#potdTitle").textContent = r.t;
    $("#potdTeaser").textContent = r.te || "";
    $("#potdCopy").onclick = (e) => copyPrompt(r.i, e.currentTarget);
    $("#potdView").onclick = () => openModal(r.i);
    $("#potd").hidden = false;
  }
  function renderSearchChips() {
    const chips = ["headshot", "cold email", "linkedin", "instagram", "youtube", "midjourney", "resume", "business plan", "study", "logo", "book", "thread"];
    const row = $("#searchChips"); row.innerHTML = `<span class="sc-label">Popular:</span>`;
    chips.forEach((q) => {
      const b = document.createElement("button"); b.className = "sc-chip"; b.textContent = q;
      b.addEventListener("click", () => { $("#search").value = q; onSearch(q); document.getElementById("groups").scrollIntoView({ behavior: "smooth", block: "start" }); });
      row.appendChild(b);
    });
  }
  function confetti(anchor) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const colors = ["#ff6b4a", "#36c98b", "#34c3c9", "#e8b04b", "#b48cff", "#e0729e"];
    for (let k = 0; k < 18; k++) {
      const p = document.createElement("div"); p.className = "confetti-piece";
      const ang = (Math.PI * 2 * k) / 18 + (k % 4) * 0.18, dist = 46 + (k % 6) * 13;
      p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = colors[k % colors.length];
      p.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      p.style.setProperty("--dy", (Math.sin(ang) * dist - 30).toFixed(1) + "px");
      p.style.setProperty("--rot", (k * 47) + "deg");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 820);
    }
  }
  function countUp(el, target) {
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(target); return; }
    const dur = 950, t0 = performance.now();
    function tick(t) { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  function animateStats() {
    countUp($("#statTotal"), state.meta.total);
    countUp($("#heroCount"), state.meta.total);
    countUp($("#statShelves"), state.meta.groups.filter((g) => g.count > 0).length);
    countUp($("#statTopics"), state.meta.groups.reduce((a, g) => a + g.categories.length, 0));
  }
  function handleDeepLink() {
    const p = new URLSearchParams(location.search).get("p");
    if (p && state.slugMap && state.slugMap[p] != null) openModal(state.slugMap[p]);
  }

  /* ---------- saved view ---------- */
  function syncSavedToggle() { $("#savedToggle").setAttribute("aria-pressed", state.savedOnly); $("#savedToggle").classList.toggle("on", state.savedOnly); }
  function showSaved() {
    if (!state.saved.size) { toast("Save prompts with the ★ to see them here"); return; }
    state.savedOnly = true; state.group = "all"; state.category = null;
    $("#groupRow").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.group === "all"));
    $("#catRow").hidden = true; syncSavedToggle(); applyFilters();
    document.getElementById("groups").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- search ---------- */
  let searchT;
  function onSearch(v) { state.query = v; $("#clearSearch").hidden = !v; clearTimeout(searchT); searchT = setTimeout(applyFilters, 120); }
  function applyInitialQuery() {
    const p = new URLSearchParams(location.search).get("q");
    if (p) { state.query = p; $("#search").value = p; $("#clearSearch").hidden = false; }
  }

  /* ---------- util ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  /* ---------- wiring ---------- */
  function wire() {
    $("#search").addEventListener("input", (e) => onSearch(e.target.value));
    $("#clearSearch").addEventListener("click", () => { $("#search").value = ""; onSearch(""); $("#search").focus(); });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });
    $("#loadMore").addEventListener("click", renderMore);
    $("#surprise").addEventListener("click", () => { const pool = state.results.length ? state.results : state.index; if (pool.length) openModal(pool[Math.floor(Math.random() * pool.length)].i); });
    $("#savedToggle").addEventListener("click", () => { if (state.savedOnly) { state.savedOnly = false; syncSavedToggle(); applyFilters(); } else showSaved(); });
    $("#savedNav").addEventListener("click", showSaved);
    $("#clearRecent").addEventListener("click", () => { try { localStorage.removeItem("pv-recent"); } catch (_) {} renderRecent(); });
    // Go Pro — until the Lemon Squeezy checkout URL is wired (data-checkout-url), capture interest
    const goPro = $("#goProBtn");
    if (goPro) goPro.addEventListener("click", (e) => {
      if (goPro.dataset.checkoutUrl) return; // real checkout set → navigate normally
      e.preventDefault();
      toast("Pro launches soon — drop your email to get launch access ✨");
      document.querySelector(".subscribe").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("#subEmail") && $("#subEmail").focus(), 500);
    });
    const subForm = $("#subForm");
    if (subForm) subForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = ($("#subEmail").value || "").trim();
      if (!email) return;
      try { localStorage.setItem("pv-sub", email); } catch (_) {}
      subForm.hidden = true; $("#subNote").hidden = false;
    });
    $("#resetAll").addEventListener("click", () => { state.query = ""; $("#search").value = ""; $("#clearSearch").hidden = true; state.savedOnly = false; syncSavedToggle(); $("#sort").value = "default"; state.sort = "default"; selectGroup("all", true); });
    $("#modalClose").addEventListener("click", hideModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") hideModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) hideModal();
      if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); }
    });
    const saved = localStorage.getItem("pv-theme"); if (saved) document.documentElement.dataset.theme = saved;
    $("#themeToggle").addEventListener("click", () => { const n = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = n; localStorage.setItem("pv-theme", n); });
    // PWA: offline service worker + installable
    if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $("#installBtn").hidden = false; });
    $("#installBtn").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#installBtn").hidden = true;
    });
    window.addEventListener("appinstalled", () => { $("#installBtn").hidden = true; toast("Installed! Find it on your home screen 🎉"); });

    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !$("#loadMore").hidden) renderMore(); }, { rootMargin: "600px" });
    io.observe($("#loadMore"));

    // scroll-reveal sections (progressive enhancement; skip if reduced motion)
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      const ro = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
      }, { threshold: 0.06, rootMargin: "0px 0px -40px 0px" });
      document.querySelectorAll(".collections, .howto, .faq").forEach((el) => { el.classList.add("reveal"); ro.observe(el); });
    }
  }

  wire(); boot();
})();
