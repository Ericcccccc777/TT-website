// 玩家页:?id=<排行榜那一行的 id>。昵称、项目说明这些是玩家自己填的字,一律 textContent。
import { rest, partners, el, fmt, avatar, region, vendorOf, COLORS, LANG, SUPABASE } from "./data.js";
import { fullNum } from "./format.js";
import { stars } from "./ring.js";

const root = document.querySelector("[data-player-page]");
const S = JSON.parse(root.dataset.strings);
const $ = (q) => root.querySelector(q);
const id = new URLSearchParams(location.search).get("id") || "";

const baseTitle = document.title;
const date = (iso) => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(LANG === "zh" ? "zh-CN" : LANG);
};

function pageState(active) {
  for (const key of ["loading", "player", "missing", "failed"]) $(`[data-${key}]`).hidden = key !== active;
}

async function main() {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    pageState("missing");
    return;
  }
  pageState("loading");
  let row;
  try {
    const { data } = await rest(`leaderboard_public?select=id,username,score,recent_score,region,created_at,updated_at,project_name,project_desc,project_url,project_image&id=eq.${id}`);
    if (!Array.isArray(data)) throw new Error("Invalid player list");
    row = data[0];
  } catch {
    pageState("failed");
    return;
  }
  if (!row) { pageState("missing"); return; }
  const name = (row.username || "").trim() || "—";
  document.title = `${name} · ${baseTitle}`;
  $("[data-name]").textContent = name;
  $("[data-total]").textContent = fmt(row.score);
  $("[data-total]").title = fullNum(row.score);
  $("[data-recent]").textContent = fmt(row.recent_score || 0);
  showProject(row);
  pageState("player");
  showMeta(row);
  showCompanion(row);
  loadModels(row.id);
}

async function rank(field, score) {
  try {
    const { total } = await rest(`leaderboard_public?select=id&${field}=gt.${Number(score) || 0}&limit=1`, { count: true });
    return Number.isSafeInteger(total) && total >= 0 ? total + 1 : null;
  } catch { return null; }
}

async function showMeta(row) {
  const [rankAll, rankRecent] = await Promise.all([rank("score", row.score),
    Number(row.recent_score) > 0 ? rank("recent_score", row.recent_score) : null]);
  const joined = row.created_at && date(row.created_at);
  $("[data-meta]").replaceChildren(...[
    region(row.region),
    rankAll ? el("span", { class: "cap", text: S.rankLifetime.replace("{n}", rankAll) }) : null,
    rankRecent ? el("span", { class: "cap", text: S.rankRecent.replace("{n}", rankRecent) }) : null,
    joined ? el("span", { text: S.joined.replace("{date}", joined) }) : null,
  ].filter(Boolean));
}

async function showCompanion(row) {
  const who = (await partners([row])).get(row.id);
  const w = who?.who || "claude";
  const art = S.boxes[w] || S.boxes.claude;
  $("[data-fig]").style.setProperty("--c", COLORS[w]);
  $("[data-fig]").replaceChildren(el("img", { class: "fig", src: `/TMI/img/chars/${w}_slide_a.webp`, width: art.w, height: art.h,
    style: `--nw:${art.width};--nb:${art.below};--body-shift:${art.shift}`, alt: S.latin[w] }));
  const say = S.say?.[w];
  if (say) {
    $("[data-say]").textContent = say.replace("{total}", fmt(row.score)).replace("{recent}", fmt(row.recent_score || 0));
    $("[data-say]").hidden = false;
  }
  const partner = $("[data-partner]");
  partner.replaceChildren(avatar(w, { size: 56, lot: who?.lot }), el("div", {},
    el("small", { class: "muted", text: S.partner }),
    el("div", {}, el("b", { style: `font-family:var(--serif);font-size:22px;color:${COLORS[w]}`, text: S.latin[w] }), (S.names[w] !== S.latin[w] ? el("span", { class: "muted", text: ` ${S.names[w]}` }) : null)),
    el("small", { class: "fine", text: who?.lot ? S.partnerLot : S.partnerBy.replace("{ai}", S.ai[w]) })));

  palace(row.id, w);
}

async function loadModels(rowId) {
  const box = $("[data-models]");
  box.replaceChildren(el("p", { class: "muted", text: S.common.loading }));
  try {
    const { data: ids } = await rest(`leaderboard?select=user_id&id=eq.${rowId}`);
    const uid = ids[0]?.user_id;
    const { data: models } = uid ? await rest(`leaderboard_models?select=provider,model,tokens&user_id=eq.${uid}&order=tokens.desc&limit=30`) : { data: [] };
    if (!models.length) box.replaceChildren(el("p", { class: "muted", text: S.noModels }));
    else {
      const max = Math.max(1, ...models.map((m) => Number(m.tokens)));
      box.replaceChildren(...models.map((m) => el("div", { class: `ubar ${vendorOf(m.provider, m.model)}` },
        el("span", { title: m.model, text: m.model }),
        el("i", { style: `--w:${Math.max(0.5, Number(m.tokens) / max * 100).toFixed(1)}%` }),
        el("span", { class: "num", text: fmt(m.tokens) }))));
    }
  } catch {
    const retry = el("button", { class: "btn btn-sm", type: "button", text: S.common.retry });
    retry.addEventListener("click", () => loadModels(rowId));
    box.replaceChildren(el("p", { class: "muted", text: S.modelsFailed }), retry);
  }
}

function httpsAddress(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function showProject(row) {
  if ((row.project_name || "").trim()) {
    const image = httpsAddress(row.project_image);
    const address = httpsAddress(row.project_url);
    const img = image && image.origin === httpsAddress(SUPABASE)?.origin
      ? el("img", { src: image.href, width: 120, height: 120, alt: "", loading: "lazy" }) : el("span");
    const link = address ? el("a", { href: address.href, rel: "noopener nofollow ugc", target: "_blank", text: address.href.slice(8) }) : null;
    $("[data-project]").replaceChildren(el("div", { class: "panel project" }, img, el("div", {},
      el("small", { class: "muted", text: S.project }), el("h3", { style: "font-size:22px", text: row.project_name }),
      row.project_desc ? el("p", { class: "muted", text: row.project_desc }) : null, link)));
  }

}
$("[data-retry]").addEventListener("click", main);
$("[data-share]").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  try { await navigator.clipboard.writeText(location.href); button.textContent = S.copied; }
  catch { prompt(S.share, location.href); }
});

const LEVEL_TEXT = (lv) => (lv <= 0 ? 0 : lv <= 2 ? 1 : lv <= 4 ? 2 : lv <= 6 ? 3 : lv === 7 ? 4 : lv <= 9 ? 5 : 6);
async function palace(rowId, w) {
  const box = $("[data-palace]");
  if (!box) return;
  let level = null;
  if (S.memLive) {
    try {
      const { data } = await rest(`leaderboard_public?select=${S.memColumn}&id=eq.${rowId}`);
      const v = Number(data?.[0]?.[S.memColumn]);
      if (Number.isFinite(v)) level = v;
    } catch { /* 这一列还没有就当没上传 */ }
  }
  // 本机预览:?mem=N 看看 N 档长什么样(线上不认,免得有人拿链接冒充别人的大小)
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const q = new URLSearchParams(location.search).get("mem");
    if (q !== null && /^\d{1,2}$/.test(q)) level = Number(q);
  }
  stars(box.querySelector("canvas"), { seed: rowId, level, color: COLORS[w] });
  box.classList.toggle("is-empty", level === null);
  $("[data-mem-level]").textContent = level === null ? "—" : S.mem.levels[LEVEL_TEXT(level)];
  if (level === null) $("[data-mem-note]").textContent = S.mem.pending;
}

main();
