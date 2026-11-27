// 读排行榜:和旧官网同一个 Supabase 项目,只用公开的 anon key 读公开的视图(权限在数据库的 RLS)。
// 网站不写数据库。页面上的字一律 textContent。
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { bigNum, ago, regionName } from "./format.js";

export const LANG = document.body.dataset.lang || "zh";
export const SUPABASE = SUPABASE_URL;
export const MAIN = ["claude", "codex", "deepseek"];
export const COLORS = { claude: "#D97757", codex: "#8A7BD0", deepseek: "#4D6BFE", kimi: "#3D4A8C", glm: "#2F7D6D", gemini: "#4285F4" };

export async function rest(query, { count = false, method = "GET", body } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("no_db");
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  if (count) headers.Prefer = "count=exact";
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let total = null;
  if (count) { const cr = res.headers.get("content-range"); total = cr && cr.includes("/") ? Number(cr.split("/")[1]) : null; }
  return { data, total };
}

export const inList = (xs) => `(${xs.map((x) => `"${String(x).replace(/"/g, "")}"`).join(",")})`;

export async function stats() {
  const { data } = await rest("rpc/get_leaderboard_stats", { method: "POST", body: {} });
  const row = Array.isArray(data) ? data[0] : data;
  return { players: Number(row?.total_trees || 0), tokens: Number(row?.total_tokens || 0) };
}

// ── 每个人身边站谁:按他最常用的那家 AI;没有模型明细就按 id 抽签(虚线框) ──
const VENDOR = [
  [/anthropic|claude/, "claude"], [/openai|codex|gpt|^o\d/, "codex"], [/deepseek/, "deepseek"],
  [/moonshot|kimi/, "kimi"], [/zhipu|glm|z\.?ai/, "glm"], [/google|gemini/, "gemini"],
];
export function vendorOf(provider, model = "") {
  const p = String(provider || "").toLowerCase(), m = String(model || "").toLowerCase();
  for (const [re, who] of VENDOR) if (re.test(p)) return who;
  for (const [re, who] of VENDOR) if (re.test(m)) return who;
  return "";
}

export function lotOf(id) {
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return MAIN[(h >>> 0) % MAIN.length];
}

/** rows 要有 id;回 Map(id → {who, lot, byVendor})。三次请求:id → user_id → 模型明细。 */
export async function partners(rows) {
  const out = new Map(rows.map((r) => [r.id, { who: lotOf(r.id), lot: true, byVendor: {} }]));
  if (!rows.length) return out;
  try {
    const { data: ids } = await rest(`leaderboard?select=id,user_id&id=in.${inList(rows.map((r) => r.id))}`);
    const uid = new Map(ids.map((r) => [r.user_id, r.id]));
    if (!uid.size) return out;
    const { data: models } = await rest(`leaderboard_models?select=user_id,provider,model,tokens&user_id=in.${inList([...uid.keys()])}&limit=2000`);
    for (const m of models) {
      const id = uid.get(m.user_id);
      const who = vendorOf(m.provider, m.model);
      if (!id || !who) continue;
      const p = out.get(id);
      p.byVendor[who] = (p.byVendor[who] || 0) + Number(m.tokens || 0);
    }
    for (const p of out.values()) {
      const best = Object.entries(p.byVendor).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) { p.who = best[0]; p.lot = false; }
    }
  } catch { /* 拿不到就都抽签 */ }
  return out;
}

// ── 小工具:造元素 ──
export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style") e.setAttribute("style", v);
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k instanceof Node ? k : String(k));
  return e;
}

export function avatar(who, { size = 44, lot = false } = {}) {
  return el("span", { class: `ava${lot ? " is-lot" : ""}`, style: `--c:${COLORS[who] || "#1F1E1D"};width:${size}px;height:${size}px` },
    el("img", { src: `/tmi/img/avatars/${who}.webp`, width: size, height: size, alt: "", loading: "lazy" }));
}

export function region(code) {
  if (!/^[A-Z]{2}$/.test(code || "")) return "";
  return el("span", { class: "region", title: regionName(code, LANG), text: code });
}

export const fmt = (n) => bigNum(n, LANG);
export const when = (iso) => ago(iso, LANG);

// ── 首页:统计一行 + 榜单前几名 ──
async function homeBits() {
  const s = document.querySelector("[data-stats]");
  if (s) {
    try {
      const st = await stats();
      const tpl = s.dataset.template || "";
      const parts = tpl.split(/(\{players\}|\{tokens\})/);
      s.replaceChildren(...parts.map((p) => p === "{players}" ? el("span", { class: "num", text: String(st.players) })
        : p === "{tokens}" ? el("span", { class: "num", text: fmt(st.tokens) }) : p));
    } catch { s.textContent = ""; }
  }
  const table = document.querySelector('[data-board="teaser"]');
  if (table) {
    const body = table.querySelector("tbody");
    try {
      const { data } = await rest(`leaderboard_public?select=id,username,score,region,updated_at&order=score.desc,id.asc&limit=${Number(table.dataset.limit || 5)}`);
      const who = await partners(data);
      body.replaceChildren(...data.map((r, i) => playerRow(r, i + 1, who.get(r.id), { score: r.score })));
    } catch {
      body.replaceChildren(el("tr", {}, el("td", { class: "board-state", colspan: 5, text: table.dataset.failed || "—" })));
    }
  }
}

export const playerHref = (id) => `/tmi/${LANG}/p/?id=${encodeURIComponent(id)}`;

export function playerRow(r, rank, partner, { score, sub = "", updated = r.updated_at } = {}) {
  const href = playerHref(r.id);
  const name = (r.username || "").trim() || "—";
  const tr = el("tr", { class: "clickable" },
    el("td", { class: `rank${rank <= 3 ? " top" : ""}`, text: String(rank) }),
    el("td", {}, el("div", { class: "who" }, avatar(partner?.who || lotOf(r.id), { size: 44, lot: partner ? partner.lot : true }),
      el("a", { href, text: name }))),
    el("td", { class: "hide-sm" }, region(r.region)),
    el("td", { class: "r" }, el("span", { class: "tok", text: fmt(score) }), sub ? el("div", { class: "sub", text: sub }) : null),
    el("td", { class: "r hide-sm sub", text: updated ? when(updated) : "" }));
  tr.addEventListener("click", (e) => { if (!e.target.closest("a")) location.href = href; });
  return tr;
}

homeBits();
