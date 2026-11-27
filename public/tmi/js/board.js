// 排行榜页:四个页签(总榜 / 近 30 天 / 厂商和模型 / 按价格折算),每页 50 人,地址里记 ?tab=&page=。
import { rest, stats, partners, playerRow, el, fmt, inList, vendorOf } from "./data.js";
import { money, fullNum } from "./format.js";

const root = document.querySelector("[data-board-page]");
const S = JSON.parse(root.dataset.strings);
const PAGE = 50;
const table = root.querySelector('[data-board="main"]');
const tbody = table.querySelector("tbody");
const pager = root.querySelector("[data-pager]");
const scoreCol = table.querySelector("[data-col-score]");
const valueNote = root.querySelector("[data-note-value]");
const views = { board: root.querySelector('[data-view="board"]'), usage: root.querySelector('[data-view="usage"]') };

const tabs = [...root.querySelectorAll("[data-tab]")];
let tab, page;
let revision = 0;

function readUrl() {
  const params = new URLSearchParams(location.search);
  tab = tabs.some((b) => b.dataset.tab === params.get("tab")) ? params.get("tab") : "lifetime";
  const requested = Number(params.get("page"));
  page = tab !== "usage" && Number.isSafeInteger(requested) && requested > 0
    && Number.isSafeInteger(requested * PAGE) ? requested : 1;
}

function retryButton(action) {
  const button = el("button", { class: "btn btn-sm", type: "button", text: S.common.retry });
  button.addEventListener("click", action);
  return button;
}

function state(text, action) {
  const cell = el("td", { colspan: 5, class: "board-state" }, el("p", { role: "status", text }));
  if (action) cell.append(retryButton(action));
  tbody.replaceChildren(el("tr", {}, cell));
}

function setUrl(push) {
  const url = new URL(location.href);
  if (tab === "lifetime") url.searchParams.delete("tab"); else url.searchParams.set("tab", tab);
  if (page <= 1) url.searchParams.delete("page"); else url.searchParams.set("page", page);
  if (url.href !== location.href) {
    if (push) history.pushState(null, "", url); else history.replaceState(null, "", url);
  }
  window.dispatchEvent(new Event("board:navigated"));
}

async function loadStats() {
  try {
    const s = await stats();
    root.querySelector('[data-stat="players"]').textContent = fullNum(s.players);
    root.querySelector('[data-stat="tokens"]').textContent = fmt(s.tokens);
  } catch { /* 统计拿不到就留着破折号 */ }
}

async function loadBoard(current, selected, number) {
  state(S.common.loading);
  const from = (number - 1) * PAGE;
  let rows = [], total = null, scores = new Map(), subs = new Map();
  try {
    if (selected === "value") {
      const { data, total: n } = await rest(`leaderboard_value?select=user_id,value_usd,estimated_usd,unpriced_tokens&order=value_usd.desc,user_id.asc&offset=${from}&limit=${PAGE}`, { count: true });
      total = Number.isSafeInteger(n) && n >= 0 ? n : null;
      if (data.length) {
        const { data: people } = await rest(`leaderboard?select=id,user_id,username,score,region,updated_at&user_id=in.${inList(data.map((v) => v.user_id))}`);
        const byUid = new Map(people.map((p) => [p.user_id, p]));
        for (const v of data) {
          const p = byUid.get(v.user_id);
          if (!p) continue;
          rows.push(p);
          scores.set(p.id, Number(v.value_usd || 0));
          subs.set(p.id, `${fmt(p.score)} token`);
        }
      }
    } else {
      const order = selected === "recent" ? "recent_score.desc,id.asc" : "score.desc,id.asc";
      const filter = selected === "recent" ? "&recent_score=gt.0" : "";
      const { data, total: n } = await rest(`leaderboard_public?select=id,username,score,recent_score,region,updated_at${filter}&order=${order}&offset=${from}&limit=${PAGE}`, { count: true });
      total = Number.isSafeInteger(n) && n >= 0 ? n : null;
      rows = data;
      for (const r of rows) {
        scores.set(r.id, selected === "recent" ? Number(r.recent_score || 0) : Number(r.score || 0));
        if (selected === "recent") subs.set(r.id, `${S.tabs.lifetime} ${fmt(r.score)}`);
      }
    }
  } catch (e) {
    if (current !== revision) return;
    if (number > 1 && e.message === "HTTP 416") { page = 1; show(); return; }
    state(S.boardFailed, () => show());
    pager.hidden = true;
    return;
  }
  if (current !== revision) return;
  const pages = total === null ? null : Math.max(1, Math.ceil(total / PAGE));
  if (pages !== null && number > pages) { page = pages; show(); return; }
  if (!rows.length && number > 1 && pages === null) { page = 1; show(); return; }
  if (!rows.length) { state(S.common.empty); pager.hidden = true; return; }
  const who = await partners(rows);
  if (current !== revision) return;
  tbody.replaceChildren(...rows.map((r, i) => {
    const tr = playerRow(r, from + i + 1, who.get(r.id), { score: scores.get(r.id), sub: subs.get(r.id) || "" });
    if (selected === "value") tr.querySelector(".tok").textContent = money(scores.get(r.id));
    return tr;
  }));
  const last = pages === null ? rows.length < PAGE : number >= pages;
  pager.hidden = number === 1 && last;
  pager.querySelector("[data-page]").textContent = S.page.replace("{n}", number) + (pages === null ? "" : ` / ${pages}`);
  pager.querySelector("[data-prev]").disabled = number <= 1;
  pager.querySelector("[data-next]").disabled = last;
}

function bars(rows, label, cls) {
  const max = Math.max(1, ...rows.map((r) => r.tokens));
  return rows.map((r) => el("div", { class: `ubar ${cls(r)}` },
    el("span", { title: label(r), text: label(r) }),
    el("i", { style: `--w:${Math.max(0.5, (r.tokens / max) * 100).toFixed(1)}%` }),
    el("span", { class: "num", text: fmt(r.tokens) })));
}

async function loadUsage(kind, current) {
  const box = root.querySelector(`[data-usage="${kind}"]`);
  const provider = kind === "provider";
  const query = provider ? "leaderboard_provider_usage?select=provider,tokens,models,players&order=tokens.desc,provider.asc"
    : "leaderboard_model_usage?select=provider,model,tokens,players&order=tokens.desc,provider.asc,model.asc&limit=24";
  box.replaceChildren(el("p", { class: "muted", text: S.common.loading }));
  try {
    const { data } = await rest(query);
    if (current !== revision) return;
    const label = (row) => {
      if (!provider) return row.model === "unknown" ? S.unknown : row.model;
      const who = vendorOf(row.provider);
      return who ? `${S.ai[who]} · ${S.latin[who]}` : row.provider === "unknown" ? S.unknown : row.provider;
    };
    box.replaceChildren(...(data.length ? bars(data.map((r) => ({ ...r, tokens: Number(r.tokens) })), label,
      (r) => vendorOf(r.provider, r.model)) : [el("p", { class: "muted", text: S.noUsage })]));
  } catch {
    if (current !== revision) return;
    box.replaceChildren(el("p", { class: "muted", text: S.usageFailed }), retryButton(() => loadUsage(kind, current)));
  }
}

function show(push = false) {
  const current = ++revision;
  for (const b of tabs) {
    const active = b.dataset.tab === tab;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  }
  views.board.hidden = tab === "usage";
  views.usage.hidden = tab !== "usage";
  valueNote.hidden = tab !== "value";
  scoreCol.textContent = tab === "value" ? S.col.value : tab === "recent" ? S.col.recent : S.col.tokens;
  setUrl(push);
  if (tab === "usage") {
    loadUsage("provider", current);
    loadUsage("model", current);
  } else {
    pager.querySelector("[data-prev]").disabled = true;
    pager.querySelector("[data-next]").disabled = true;
    loadBoard(current, tab, page);
  }
}

for (const [i, b] of tabs.entries()) {
  b.addEventListener("click", () => {
    if (b.dataset.tab === tab) return;
    tab = b.dataset.tab; page = 1; pager.hidden = true; show(true);
  });
  b.addEventListener("keydown", (event) => {
    const dest = { ArrowLeft: (i + tabs.length - 1) % tabs.length, ArrowRight: (i + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (dest === undefined) return;
    event.preventDefault(); tabs[dest].focus(); tabs[dest].click();
  });
}
pager.querySelector("[data-prev]").addEventListener("click", () => { page = Math.max(1, page - 1); show(true); root.scrollIntoView(); });
pager.querySelector("[data-next]").addEventListener("click", () => { page += 1; show(true); root.scrollIntoView(); });
window.addEventListener("popstate", () => { readUrl(); show(); });
readUrl();
loadStats();
show();
