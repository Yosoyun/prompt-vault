/* ============================================================
   THE PROMPT VAULT — app logic
   Vanilla JS · no build step · loads index first, bodies lazily
   ============================================================ */
(() => {
  "use strict";

  const BATCH = 48;
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (n) => n.toLocaleString("en-US");

  const state = {
    meta: null,
    index: [],          // all records (slim)
    bodies: null,       // lazy: array aligned by .i  -> {p,h}
    bodiesPromise: null,
    group: "all",
    category: null,
    query: "",
    sort: "default",
    results: [],
    shown: 0,
    groupColor: {},     // key -> color
  };

  /* ---------- data loading ---------- */
  async function boot() {
    try {
      const [meta, index] = await Promise.all([
        fetch("data/meta.json").then((r) => r.json()),
        fetch("data/index.json").then((r) => r.json()),
      ]);
      state.meta = meta;
      state.index = index;
      meta.groups.forEach((g) => (state.groupColor[g.key] = g.color));

      // precompute lowercase search blob + category label map
      const catLabel = {};
      meta.groups.forEach((g) => g.categories.forEach((c) => (catLabel[c.name] = c.label)));
      state.catLabel = catLabel;
      for (const r of index) {
        r._s = (r.t + " " + r.te + " " + r.a + " " + (catLabel[r.c] || r.c)).toLowerCase();
      }

      hydrateMeta();
      renderGroups();
      applyFilters();
      ensureBodies(); // warm the cache in the background
    } catch (err) {
      $("#resultCount").textContent = "";
      $("#grid").innerHTML =
        `<div class="empty" style="grid-column:1/-1;display:block">
           <div class="empty-mark">⚠️</div>
           <h3>Couldn’t load the vault</h3>
           <p>The data files need to be served over http. Run a local server in this
           folder (<code>python3 -m http.server</code>) or open the live site.</p>
         </div>`;
      console.error(err);
    }
  }

  function ensureBodies() {
    if (state.bodies) return Promise.resolve(state.bodies);
    if (!state.bodiesPromise) {
      state.bodiesPromise = fetch("data/bodies.json")
        .then((r) => r.json())
        .then((b) => { state.bodies = b; return b; });
    }
    return state.bodiesPromise;
  }

  /* ---------- meta / hero ---------- */
  function hydrateMeta() {
    const total = state.meta.total;
    $("#heroCount").textContent = fmt(total);
    $("#statTotal").textContent = fmt(total);
    const topics = state.meta.groups.reduce((a, g) => a + g.categories.length, 0);
    $("#heroStats").querySelectorAll("b")[2] && ($("#heroStats").querySelectorAll("b")[2].textContent = topics);
    $("#search").placeholder = `Search ${fmt(total)} prompts — “blog outline”, “cold email”, “midjourney”…`;
    $("#year").textContent = new Date().getFullYear();
  }

  /* ---------- group + category chips ---------- */
  function renderGroups() {
    const row = $("#groupRow");
    const all = chip({ key: "all", label: "All prompts", icon: "✦", count: state.meta.total, color: "var(--accent)" }, state.group === "all");
    row.appendChild(all);
    state.meta.groups.forEach((g) => {
      row.appendChild(chip(g, state.group === g.key));
    });
  }

  function chip(g, active) {
    const el = document.createElement("button");
    el.className = "chip" + (active ? " active" : "");
    el.style.setProperty("--c", g.color);
    el.dataset.group = g.key;
    el.innerHTML = `<span class="ico">${g.icon}</span><span>${g.label}</span><span class="n">${fmt(g.count)}</span>`;
    el.addEventListener("click", () => selectGroup(g.key));
    return el;
  }

  function selectGroup(key) {
    state.group = key;
    state.category = null;
    $("#groupRow").querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.group === key));
    renderCategoryRow();
    applyFilters();
  }

  function renderCategoryRow() {
    const row = $("#catRow");
    row.innerHTML = "";
    if (state.group === "all") { row.hidden = true; return; }
    const g = state.meta.groups.find((x) => x.key === state.group);
    if (!g || !g.categories.length) { row.hidden = true; return; }
    row.hidden = false;

    const mkCat = (name, label, count, active) => {
      const el = document.createElement("button");
      el.className = "chip" + (active ? " active" : "");
      el.style.setProperty("--c", g.color);
      el.innerHTML = `<span>${label}</span><span class="n">${fmt(count)}</span>`;
      el.addEventListener("click", () => {
        state.category = active ? null : name;
        renderCategoryRow();
        applyFilters();
      });
      return el;
    };
    row.appendChild(mkCat(null, "All " + g.label, g.count, state.category === null));
    g.categories.forEach((c) => row.appendChild(mkCat(c.name, c.label, c.count, state.category === c.name)));
  }

  /* ---------- filtering / sorting ---------- */
  function applyFilters() {
    const q = state.query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    let res = state.index.filter((r) => {
      if (state.group !== "all" && r.g !== state.group) return false;
      if (state.category && r.c !== state.category) return false;
      if (terms.length) {
        for (const t of terms) if (!r._s.includes(t)) return false;
      }
      return true;
    });

    switch (state.sort) {
      case "az": res = res.slice().sort((a, b) => a.t.localeCompare(b.t)); break;
      case "short": res = res.slice().sort((a, b) => a.len - b.len); break;
      case "long": res = res.slice().sort((a, b) => b.len - a.len); break;
      default: break; // featured / source order
    }

    state.results = res;
    state.shown = 0;
    $("#grid").innerHTML = "";
    updateCount();
    renderMore();
    $("#empty").hidden = res.length > 0;
  }

  function updateCount() {
    const n = state.results.length;
    let scope = "all shelves";
    if (state.group !== "all") {
      const g = state.meta.groups.find((x) => x.key === state.group);
      scope = state.category ? (state.catLabel[state.category] || state.category) : g.label;
    }
    const qpart = state.query.trim() ? ` matching “${state.query.trim()}”` : "";
    $("#resultCount").innerHTML = `<b>${fmt(n)}</b> prompt${n === 1 ? "" : "s"} · ${scope}${qpart}`;
  }

  function renderMore() {
    const frag = document.createDocumentFragment();
    const end = Math.min(state.shown + BATCH, state.results.length);
    for (let k = state.shown; k < end; k++) frag.appendChild(cardEl(state.results[k]));
    $("#grid").appendChild(frag);
    state.shown = end;
    $("#loadMore").hidden = state.shown >= state.results.length;
    if (!$("#loadMore").hidden) {
      $("#loadMore").textContent = `Load ${Math.min(BATCH, state.results.length - state.shown)} more · ${fmt(state.results.length - state.shown)} left`;
    }
  }

  /* ---------- card ---------- */
  function cardEl(r) {
    const g = state.meta.groups.find((x) => x.key === r.g);
    const color = g ? g.color : "var(--accent)";
    const el = document.createElement("article");
    el.className = "card";
    el.style.setProperty("--c", color);

    const vars = (r.v || []).slice(0, 4).map((v) => `<span class="var-tag">${esc(v)}</span>`).join("");
    const author = r.a
      ? (r.u
          ? `via <a href="${esc(r.u)}" target="_blank" rel="noopener nofollow">${esc(r.a)}</a>`
          : `via ${esc(r.a)}`)
      : "AIPRM community";

    el.innerHTML = `
      <div class="card-top">
        <span class="badge">${g ? g.icon : "✦"} ${g ? g.label : ""}</span>
        <span class="card-cat">${esc(state.catLabel[r.c] || r.c)}</span>
      </div>
      <h3 class="card-title">${esc(r.t)}</h3>
      <p class="card-teaser">${esc(r.te || "Ready-to-use AI prompt. Click view to read the full text.")}</p>
      ${vars ? `<div class="card-vars">${vars}</div>` : ""}
      <div class="card-actions">
        <button class="copy-btn" data-i="${r.i}"><span class="ci">⧉</span> <span class="ct">Copy</span></button>
        <button class="view-btn" data-i="${r.i}">View</button>
      </div>
      <div class="card-foot">
        <span class="card-author">${author}</span>
        <span class="card-len">${fmt(r.len)} chars</span>
      </div>`;

    el.querySelector(".copy-btn").addEventListener("click", (e) => copyPrompt(r.i, e.currentTarget));
    el.querySelector(".view-btn").addEventListener("click", () => openModal(r.i));
    return el;
  }

  /* ---------- copy ---------- */
  async function copyPrompt(i, btn) {
    const txt = btn ? btn.querySelector(".ct") : null;
    if (txt) txt.textContent = "…";
    const bodies = await ensureBodies();
    const text = bodies[i] ? bodies[i].p : "";
    const ok = await toClipboard(text);
    if (btn) {
      btn.classList.toggle("done", ok);
      if (txt) txt.textContent = ok ? "Copied" : "Failed";
      setTimeout(() => { btn.classList.remove("done"); if (txt) txt.textContent = "Copy"; }, 1600);
    }
    if (ok) toast();
  }

  async function toClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    if (msg) t.textContent = msg;
    t.hidden = false; requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.classList.remove("show"); }, 1700);
  }

  /* ---------- modal ---------- */
  async function openModal(i) {
    const r = state.index[i];
    const g = state.meta.groups.find((x) => x.key === r.g);
    const color = g ? g.color : "var(--accent)";
    const card = $(".modal-card");
    card.style.setProperty("--c", color);
    $("#mBadge").textContent = `${g ? g.icon : "✦"} ${g ? g.label : ""} · ${state.catLabel[r.c] || r.c}`;
    $("#mTitle").textContent = r.t;
    const authorHTML = r.a
      ? (r.u ? `via <a href="${esc(r.u)}" target="_blank" rel="noopener nofollow">${esc(r.a)}</a>` : `via ${esc(r.a)}`)
      : "AIPRM community";
    $("#mMeta").innerHTML = `${authorHTML} &nbsp;·&nbsp; ${fmt(r.len)} characters`;

    // variables
    const mv = $("#mVars");
    if (r.v && r.v.length) {
      mv.hidden = false;
      mv.innerHTML = `<span class="lbl">Replace before using:</span>` +
        r.v.map((v) => `<span class="var-tag">${esc(v)}</span>`).join("");
    } else mv.hidden = true;

    $("#mPrompt").innerHTML = `<span class="sk" style="display:block;height:14px;width:60%;margin:4px 0"></span>`;
    showModal();

    const bodies = await ensureBodies();
    const body = bodies[i] || { p: "", h: "" };
    $("#mPrompt").innerHTML = highlightVars(body.p, r.v);
    const hint = $("#mHint");
    if (body.h) { hint.hidden = false; hint.textContent = "💡 " + body.h; } else hint.hidden = true;

    const openAI = $("#mOpenAI");
    openAI.href = "https://chat.openai.com/";
    $("#mCopy").onclick = async (e) => {
      const ok = await toClipboard(body.p);
      const ct = e.currentTarget.querySelector(".ct");
      e.currentTarget.classList.toggle("done", ok);
      ct.textContent = ok ? "Copied ✓" : "Copy failed";
      if (ok) toast();
      setTimeout(() => { e.currentTarget.classList.remove("done"); ct.textContent = "Copy prompt"; }, 1700);
    };
  }

  function highlightVars(text, vars) {
    let html = esc(text);
    (vars || []).forEach((v) => {
      const safe = esc(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(safe, "g"), `<mark>${esc(v)}</mark>`);
    });
    return html;
  }

  function showModal() {
    const m = $("#modal");
    m.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function hideModal() {
    $("#modal").hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- search ---------- */
  let searchT;
  function onSearch(v) {
    state.query = v;
    $("#clearSearch").hidden = !v;
    clearTimeout(searchT);
    searchT = setTimeout(applyFilters, 120);
  }

  /* ---------- util ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- wiring ---------- */
  function wire() {
    $("#search").addEventListener("input", (e) => onSearch(e.target.value));
    $("#clearSearch").addEventListener("click", () => {
      $("#search").value = ""; onSearch("");
      $("#search").focus();
    });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });
    $("#loadMore").addEventListener("click", renderMore);
    $("#resetAll").addEventListener("click", () => {
      state.query = ""; $("#search").value = ""; $("#clearSearch").hidden = true;
      selectGroup("all"); $("#sort").value = "default"; state.sort = "default";
    });

    $("#modalClose").addEventListener("click", hideModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") hideModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) hideModal();
      if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); }
    });

    // theme
    const saved = localStorage.getItem("pv-theme");
    if (saved) document.documentElement.dataset.theme = saved;
    $("#themeToggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("pv-theme", next);
    });

    // infinite scroll
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !$("#loadMore").hidden) renderMore();
    }, { rootMargin: "600px" });
    io.observe($("#loadMore"));
  }

  wire();
  boot();
})();
