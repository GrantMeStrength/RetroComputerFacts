"use strict";

/* ------------------------------------------------------------------ data */
const DATA_URL = "data/computers.json";
const MAP_URL = "data/asset-map.json";

let COMPUTERS = [];
const ASSET = {};            // assetName -> "assets/<file>"
const byId = new Map();
const CATEGORIES = {};       // category -> Set(ids)

const PERIPH_ICON = {
  storage: "▤", printer: "▲", joystick: "✦", input: "✎", expansion: "▣",
  display: "▭", audio: "♪", networking: "❖", other: "◍"
};
const COMM_ICON = {
  userGroup: "☰", magazine: "▤", hardware: "⚙", website: "◍", event: "▦", youtube: "▶"
};

/* ------------------------------------------------------------- utilities */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function imgPath(assetName) {
  const p = ASSET[assetName];
  if (!p) return null;
  return p.replace(/^\//, "").startsWith("data/") ? p : "data/" + p.replace(/^\//, "");
}

function isScreenshot(name) { return /screenshot|screen/i.test(name); }

/* ------------------------------------------------------------ app shell */
function shell() {
  return `
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#/">
        <span class="brand-mark">▚</span>
        <span class="brand-text">Retro Computer Collection<small>the home-computer era, in your browser</small></span>
      </a>
      <div class="search" id="searchwrap" ${onDetail() ? "hidden" : ""}>
        <input id="search" type="search" placeholder="Search 113 computers — try 'spectrum', 'C64', 'Z80'…"
               autocomplete="off" spellcheck="false" aria-label="Search computers" />
      </div>
      <div class="header-spacer"></div>
      <button class="btn accent" id="shuffle" title="Random computer">
        <span aria-hidden="true">⚄</span> <span>Random</span>
      </button>
      <span class="header-count"><b>${COMPUTERS.length}</b> machines</span>
    </div>
  </header>
  <main id="main" class="container"></main>
  <footer class="site-footer">
    <div class="footer-inner">
      <span class="fbrand">Retro Computer Collection · <b>${COMPUTERS.length}</b> machines, 1975–1995</span>
      <span>Read-only facts · every spec &amp; story is pulled straight from the iOS app's data. Open-source on <a href="https://github.com/GrantMeStrength/RetroComputerFacts" target="_blank" rel="noopener">GitHub</a>.</span>
    </div>
  </footer>`;
}

function onDetail() { return location.hash.startsWith("#/c/"); }

/* ------------------------------------------------------------- home view */
const state = { q: "", cat: "All", sort: "year" };

function applyFilters() {
  const q = state.q.trim().toLowerCase();
  let list = [...COMPUTERS];
  if (state.cat !== "All") list = list.filter(c => c.category === state.cat);
  if (q) list = list.filter(c => match(c, q));
  if (state.sort === "year") list.sort((a, b) => a.year - b.year || a.displayName.localeCompare(b.displayName));
  if (state.sort === "name") list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  if (state.sort === "country") list.sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
  return list;
}

function match(c, q) {
  const hay = [c.displayName, c.fullName, c.manufacturer, c.cpu, c.ram, c.sound,
    c.country, ...(c.keyFeatures || []), c.overview].join(" ").toLowerCase();
  return q.split(/\s+/).every(t => hay.includes(t));
}

function renderHome() {
  const main = $("#main");
  const counts = { "All": COMPUTERS.length };
  COMPUTERS.forEach(c => counts[c.category] = (counts[c.category] || 0) + 1);
  const cats = ["All", ...Object.keys(CATEGORIES)];
  const list = applyFilters();

  main.innerHTML = `
    <section class="hero" aria-labelledby="home-h">
      <h1 id="home-h"><span class="glow">The golden age</span> of personal computing</h1>
      <p class="lede">Browse ${COMPUTERS.length} legendary home computers — from the Altair and ZX80 to the Amiga and the first Macs. Each machine carries its full story, specifications, sample programs, the games it ran, and links to emulators you can play in your browser. No login, no install.</p>
      <div class="stats">
        <div class="stat"><b>${COMPUTERS.length}</b><span>Machines</span></div>
        <div class="stat"><b>${new Set(COMPUTERS.map(c => c.country)).size}</b><span>Countries</span></div>
        <div class="stat"><b>${Math.min(...COMPUTERS.map(c => c.year))}–${Math.max(...COMPUTERS.map(c => c.year))}</b><span>Era</span></div>
        <div class="stat"><b>${COMPUTERS.reduce((n, c) => n + (c.samplePrograms?.length || 0), 0)}</b><span>Sample programs</span></div>
      </div>
    </section>

    <div class="filterbar" role="tablist" aria-label="Filter by region">
      ${cats.map(cat => `
        <button class="filterbtn ${state.cat === cat ? "active" : ""}" data-cat="${esc(cat)}" role="tab" aria-selected="${state.cat === cat}">
          ${esc(cat)} <span class="n">${counts[cat] || 0}</span>
        </button>`).join("")}
      <label class="sortctl">Sort
        <select id="sort" aria-label="Sort computers">
          <option value="year" ${state.sort === "year" ? "selected" : ""}>Year</option>
          <option value="name" ${state.sort === "name" ? "selected" : ""}>Name A–Z</option>
          <option value="country" ${state.sort === "country" ? "selected" : ""}>Country</option>
        </select>
      </label>
    </div>

    ${list.length ? `
      <div class="grid" role="list">
        ${list.map(card).join("")}
      </div>`
    : `<div class="empty"><div class="glyph">⌕</div><h3>No matches</h3><p>Try a different name, CPU, or clear the region filter.</p></div>`}
  `;
  syncBodyCat("All");
  wireHome();
  const si = $("#search"); if (si) { si.value = state.q; if (!onDetail()) si.focus({ preventScroll: true }); }
}

function card(c) {
  const cover = (c.photos || []).find(p => !isScreenshot(p.assetName));
  const path = cover ? imgPath(cover.assetName) : null;
  const media = path
    ? `<img loading="lazy" src="${esc(path)}" alt="${esc(c.displayName)}" onerror="this.closest('.thumb').classList.add('noimg');this.remove()" />`
    : `<div class="fallback"><span class="glyph">${esc(cpuGlyph(c.cpu))}</span><span>${esc(c.category)}</span></div>`;
  return `
  <a class="card" role="listitem" href="#/c/${encodeURIComponent(c.id)}" data-id="${esc(c.id)}">
    <div class="thumb">
      ${media}
      <span class="year-badge">${c.year}</span>
      <span class="cat-badge"><span class="dot" style="background:var(--catcol,${catColor(c.category)})"></span>${esc(c.category)}</span>
    </div>
    <div class="body">
      <h3 class="name">${esc(c.displayName)}</h3>
      <p class="sub"><span>${esc(c.manufacturer)}</span><span class="sep">·</span><span>${esc(c.country)}</span></p>
      <div class="mini">
        <span>${esc(c.cpu || "")}</span>
        <span>${esc(c.ram ? c.ram : "")}</span>
      </div>
    </div>
  </a>`;
}

/* catColor + cpuGlyph */
function catColor(cat) {
  return { British: "#ff5c74", American: "#5aa5ff", Japanese: "#ff7eb0",
    European: "#54e07a", Other: "#b8a7ff" }[cat] || "#b8a7ff";
}
function cpuGlyph(cpu) {
  return (cpu || "CPU").replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "CPU";
}

/* ------------------------------------------------------------ detail view */
function renderDetail(id) {
  const c = byId.get(id);
  const main = $("#main");
  if (!c) {
    main.innerHTML = `<div class="empty"><div class="glyph">▚</div><h3>Unknown machine</h3><p><a href="#/">Return to the full collection</a></p></div>`;
    syncBodyCat("All");
    return;
  }
  syncBodyCat(c.category);

  const cover = (c.photos || []).find(p => !isScreenshot(p.assetName));
  const coverPath = cover ? imgPath(cover.assetName) : null;
  const media = coverPath
    ? `<img src="${esc(coverPath)}" alt="${esc(c.displayName)}" onerror="this.closest('.media').classList.add('noimg');this.remove()" />`
    : `<div class="fallback"><span class="glyph">${esc(cpuGlyph(c.cpu))}</span><span>${esc(c.category)} · ${c.year}</span></div>`;

  main.innerHTML = `
    <div class="detail narrow">
      <a class="back" href="#/">← Back to the collection</a>

      <div class="detail-hero" data-cat="${esc(c.category)}">
        <div class="media">${media}</div>
        <div class="info">
          <div class="kicker">${esc(c.category)} · ${esc(c.era)}</div>
          <h1>${esc(c.displayName)}</h1>
          <p class="fullname">${esc(c.manufacturer)} · ${esc(c.year)} · ${esc(c.country)}</p>
          <div class="badges">
            <span class="badge"><span class="dot" style="background:${catColor(c.category)}"></span>${esc(c.category)}</span>
            <span class="badge">▣ ${esc(c.cpu || "")}</span>
            <span class="badge">◧ ${esc(clock(c) || "")}</span>
            <span class="badge">▤ ${esc(ramShort(c) || "")}</span>
          </div>
        </div>
      </div>

      ${specs(c)}

      <section class="section"><div class="section-head"><h2><span class="tick">▚</span> The story</h2></div>
        <div class="prose">${paragraphs(c.overview)}</div>
      </section>

      ${(c.keyFeatures || []).length ? features(c) : ""}
      ${historicalNotes(c)}
      ${samplePrograms(c)}
      ${peripherals(c)}
      ${popularGames(c)}
      ${emulators(c)}
      ${community(c)}
      ${gallery(c)}

      <a class="back" href="#/">← Back to the collection</a>
    </div>
  `;
  wireDetail(c);
}

/* ---------- spec grid ---------- */
function specs(c) {
  const rows = [
    ["CPU", c.cpu], ["Clock speed", c.clockSpeed], ["RAM", c.ram], ["ROM", c.rom],
    ["Display", c.display], ["Sound", c.sound], ["Storage", c.storage],
    ["Launch price", c.originalPrice], ["Units sold", c.unitsSold],
  ].filter(([, v]) => v && String(v).trim());
  if (!rows.length) return "";
  return `<div class="specs" aria-label="Specifications">
    ${rows.map(([k, v]) => `
      <div class="spec"><div class="k">${esc(k)}</div><div class="v ${k === "CPU" ? "accentv" : ""}">${esc(v)}</div></div>`).join("")}
  </div>`;
}
function clock(c) { return c.clockSpeed; }
function ramShort(c) { return (c.ram || "").split(" (")[0].split(" / ")[0]; }

function sections(title, tick, inner) {
  if (!inner) return "";
  return `<section class="section"><div class="section-head"><h2><span class="tick">${tick}</span> ${esc(title)}</h2></div>${inner}</section>`;
}

function features(c) {
  const items = (c.keyFeatures || []).filter(x => x.trim()).map(t => `<li>${esc(t)}</li>`).join("");
  if (!items) return "";
  return `<section class="section"><div class="section-head"><h2><span class="tick">▚</span> Key features</h2></div>
    <ul class="features">${items}</ul></section>`;
}

function historicalNotes(c) {
  const notes = (c.historicalNotes || []).filter(n => n.text);
  if (!notes.length) return "";
  const inner = `<div class="notes">${notes.map((n, i) => `
    <details class="note" ${i === 0 ? "open" : ""}>
      <summary>${esc(n.title || "Note")}<span class="caret">›</span></summary>
      <div class="note-body prose">${paragraphs(n.text)}</div>
    </details>`).join("")}</div>`;
  return sections("In the margins", "✎", inner);
}

function samplePrograms(c) {
  const progs = (c.samplePrograms || []).filter(p => (p.code || "").trim());
  if (!progs.length) return "";
  const inner = `<div class="code-stack">${progs.map(p => `
    <div class="code">
      <div class="bar"><span class="title">${esc(p.title || "Listing")}</span><span class="lang">${esc(p.language || "")}</span></div>
      ${p.description ? `<div class="desc">${esc(p.description)}</div>` : ""}
      <pre><code>${esc(p.code)}</code></pre>
    </div>`).join("")}</div>`;
  return sections("Sample programs", "{ }", inner);
}

function peripherals(c) {
  const items = (c.peripherals || []).filter(p => p.name);
  if (!items.length) return "";
  const inner = `<div class="rows">${items.map(p => `
    <div class="row">
      <span class="ic" aria-hidden="true">${PERIPH_ICON[p.type] || "◍"}</span>
      <div class="rmain"><div class="t">${esc(p.name)}</div>${p.description ? `<div class="d">${esc(p.description)}</div>` : ""}</div>
      ${(p.type || p.manufacturer || p.yearReleased) ? `<span class="tag">${esc([p.type, p.yearReleased].filter(Boolean).join(" · "))}</span>` : ""}
    </div>`).join("")}</div>`;
  return sections("Peripherals &amp; expansion", "⚙", inner);
}

function popularGames(c) {
  const games = (c.popularGames || []).filter(g => g.title);
  if (!games.length) return "";
  const inner = `<div class="linkgrid">
    <div class="linkcol"><ul class="linklist">${games.map(g => `
      <li class="linkitem">
        <div class="t">${esc(g.title)}${g.year ? ` · ${esc(g.year)}` : ""}</div>
        ${g.developer ? `<div class="d">${esc(g.developer)}${g.genre ? ` — ${esc(g.genre)}` : ""}</div>` : ""}
      </li>`).join("")}</ul></div>
  </div>`;
  return sections("Popular games", "▶", inner);
}

function emulators(c) {
  const links = (c.emulatorLinks || []).filter(l => l.url);
  if (!links.length) return "";
  const sorted = [...links].sort((a, b) => (b.isBrowserBased ? 1 : 0) - (a.isBrowserBased ? 1 : 0));
  const inner = `<ul class="linklist">${sorted.map(l => `
    <li class="linkitem">
      <div class="t">${l.isBrowserBased ? `<span class="browser-badge">PLAY IN BROWSER</span>` : ""}${esc(l.name)}
        <a class="go" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(l.name)}">→</a></div>
      ${l.platform ? `<div class="d">${esc(l.platform)}${l.description ? ` — ${esc(l.description)}` : ""}</div>` : (l.description ? `<div class="d">${esc(l.description)}</div>` : "")}
    </li>`).join("")}</ul>`;
  return sections("Play it", "⚡", inner);
}

function community(c) {
  const items = (c.communityResources || []).filter(r => r.name);
  if (!items.length) return "";
  const groups = {};
  items.forEach(r => { (groups[r.category] = groups[r.category] || []).push(r); });
  const inner = `<div class="linkgrid">
    ${Object.entries(groups).map(([cat, rows]) => {
      const icon = (COMM_ICON[cat] || "◍");
      const label = catLabel(cat);
      return `<div class="linkcol"><h3>${icon} ${esc(label)}</h3><ul class="linklist">
        ${rows.map(r => `
          <li class="linkitem">
            <div class="t">${esc(r.name)}${r.url ? `<a class="go" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(r.name)}">→</a>` : ""}</div>
            ${r.description ? `<div class="d">${esc(r.description)}</div>` : ""}
          </li>`).join("")}
      </ul></div>`;
    }).join("")}
  </div>`;
  return sections("The community", "☰", inner);
}

function catLabel(cat) {
  return { userGroup: "User groups & forums", magazine: "Magazines & publications",
    hardware: "New hardware & products", website: "Websites & archives",
    event: "Events & shows", youtube: "YouTube channels" }[cat] || cat;
}

function gallery(c) {
  const all = (c.photos || []).filter(p => p.assetName && imgPath(p.assetName));
  const shots = all.filter(p => isScreenshot(p.assetName));
  const photos = all.filter(p => !isScreenshot(p.assetName));
  if (!photos.length && !shots.length) return "";
  const inner = `
    ${photos.length ? `<div class="shots">${photos.map(shot).join("")}</div>` : ""}
    ${shots.length ? `
      <div class="section-head" style="margin-top:22px"><h2 style="font-size:16px"><span class="tick">▚</span> On-screen</h2></div>
      <div class="shots">${shots.map(shot).join("")}</div>` : ""}`;
  return sections("Photos", "▣", inner);
}
function shot(p) {
  return `<figure class="shot"><img loading="lazy" src="${esc(imgPath(p.assetName))}" alt="${esc(p.caption || "screenshot")}"><figcaption>${esc(p.caption || "")}</figcaption></figure>`;
}

/* -------------------------------------------------------- small helpers */
function paragraphs(text) {
  const t = (text || "").trim();
  if (!t) return "";
  return t.split(/\n{2,}/).map(p => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");
}
function syncBodyCat(cat) {
  document.body.dataset.cat = cat;
  const cssVar = { British: "#ff5c74", American: "#5aa5ff", Japanese: "#ff7eb0", European: "#54e07a", Other: "#b8a7ff", All: "#8be36a" }[cat];
  if (cssVar) document.documentElement.style.setProperty("--catcol", cssVar);
}

/* ---------------------------------------------------------------- wiring */
function wireHome() {
  const si = $("#search");
  si?.addEventListener("input", () => { state.q = si.value; rerenderList(); });
  $("#sort")?.addEventListener("change", (e) => { state.sort = e.target.value; rerenderList(); });
  document.querySelectorAll(".filterbtn").forEach(b => b.addEventListener("click", () => {
    state.cat = b.dataset.cat;
    document.querySelectorAll(".filterbtn").forEach(x => x.classList.toggle("active", x === b));
    rerenderList();
  }));
}
function rerenderList() {
  renderHome();
}

function wireDetail(c) {
  // open first note already; nothing else
}

function shuffle() {
  if (location.hash.startsWith("#/c/")) document.body.classList.remove("loading");
  const pick = COMPUTERS[Math.floor(Math.random() * COMPUTERS.length)];
  location.hash = "#/c/" + encodeURIComponent(pick.id);
}

function go() {
  const app = $("#app");
  app.classList.remove("loading");
  document.body.dataset.route = onDetail() ? "detail" : "home";
  if (onDetail()) {
    const raw = decodeURIComponent(location.hash.replace("#/c/", ""));
    renderDetail(raw);
  } else {
    renderHome();
  }
  window.scrollTo({ top: 0 });
}

function load() {
  const app = $("#app");
  app.innerHTML = `<div class="loading"><div class="boot"><div class="boot-logo">Retro Computer Collection</div><div class="boot-bar"><span></span></div></div></div>`;
  return Promise.all([
    fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(MAP_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]).then(([data, map]) => {
    COMPUTERS = data || [];
    Object.assign(ASSET, map || {});
    COMPUTERS.forEach(c => { byId.set(c.id, c); (CATEGORIES[c.category] = CATEGORIES[c.category] || new Set()).add(c.id); });
    app.innerHTML = shell();
    $("#shuffle").addEventListener("click", shuffle);
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !onDetail() && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); $("#search")?.focus(); }
      if (e.key === "Escape") { if (onDetail()) location.hash = "#/"; else $("#search")?.blur(); }
    });
    window.addEventListener("hashchange", () => {
      document.body.classList.remove("loading");
      go();
    });
    document.body.classList.remove("loading");
    go();
  }).catch((err) => {
    app.innerHTML = `<div class="loading"><div class="empty" style="margin:auto;max-width:420px"><div class="glyph">▚</div><h3>Couldn't load the data</h3><p>${esc(String(err.message || err))} — the site needs the <code>data/</code> folder. Open <code>index.html</code> from a local server, not <code>file://</code>.</p></div></div>`;
    document.body.classList.remove("loading");
  });
}

document.addEventListener("DOMContentLoaded", load);
