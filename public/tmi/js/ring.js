// 「她记得的事」的 ∞。形状和 App 的 src/memring.py 是同一组数:宽幅的 ∞,两头宽、中间收成一点,交叉点上一颗星。
//   data-ring="live"  :角色页那一个。五束流道里流着 0 和 1,鼠标放上去说这一股是哪种记忆(举的例子是编的,写在页面上)。
//   data-ring="stars" :玩家页那一个。只有星点,糊过、缩小、不能点 —— 只看得出大概有多少,看不到任何一条内容。
// 网站拿不到任何人的记忆:live 用的是字典里编的例子,stars 只用一个「有多少」的档位,点的位置由玩家 id 当种子随机撒。

const A = 216, B = 146, K = 0.22, WMAX = 17;
// 束:几条流道、在带宽上从哪到哪、哪种墨、流速(和 memring.BUNDLES 一样)
const BUNDLES = [[2, -1.00, -0.88, "soft", 11], [3, -0.68, -0.48, "rim", 23], [5, -0.26, 0.14, "core", 36],
  [3, 0.34, 0.54, "mid", 17], [2, 0.76, 0.92, "rim", 9]];
const TIER_OF = { core: "long", mid: "mid", rim: "short", soft: "style" };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const curve = (t) => { const d = 1 + K * Math.sin(t) ** 2; return [A * Math.cos(t) / d, B * Math.sin(t) * Math.cos(t) / d]; };
const band = (r) => 1.2 + (WMAX - 1.2) * smooth(4, 150, r) ** 0.75;

/** 按弧长等分的中心线:每一点 [x, y, 法向 x, 法向 y, 半宽]。 */
function centreLine(n) {
  const fine = 4000, pts = [], cum = [0];
  for (let i = 0; i <= fine; i++) pts.push(curve(i / fine * 2 * Math.PI));
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = L * i / n;
    while (cum[j + 1] < target) j++;
    const [x0, y0] = pts[j], [x1, y1] = pts[j + 1];
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, f = (target - cum[j]) / len;
    const x = x0 + dx * f, y = y0 + dy * f;
    out.push([x, y, -dy / len, dx / len, band(Math.hypot(x, y))]);
  }
  return { line: out, L };
}

function rng(seed) {                       // mulberry32:同一个种子撒出来的星永远一样
  let a = 0;
  for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 2654435761);
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function fit(canvas) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  const W = Math.max(10, Math.round(r.width)), H = Math.max(10, Math.round(r.height));
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H, dpr };
}

// ─────────────────────────── 角色页:流着 0101 的 ∞ ───────────────────────────
function live(canvas) {
  const opt = JSON.parse(canvas.dataset.opt || "{}");
  const tip = canvas.parentElement.querySelector("[data-ring-tip]");
  const ink = { core: "#1F1E1D", mid: "#5F5A53", rim: opt.deep || "#A9492A", soft: opt.soft || "#C7876B" };
  let S = null, hover = null, lastDraw = 0, running = false, visible = false;
  const lanesOf = new Map();          // bundle 序号 -> 这一束的流道

  function build() {
    const { ctx, W, H, dpr } = fit(canvas);
    const pad = 10;
    const k = Math.min((W - 2 * pad) / (2 * (A + WMAX)), (H - 2 * pad) / (B * 1.2));
    const step = W < 520 ? 6 : 5;                         // 一条流道上隔几个像素一个字
    const { line, L } = centreLine(Math.max(200, Math.round(L0 * k / step)));
    const n = line.length, cx = W / 2, cy = H / 2;
    const r = rng(opt.who || "x");
    const lanes = [];
    lanesOf.clear();
    BUNDLES.forEach(([count, lo, hi, kind, speed], bi) => {
      const gap = count > 1 ? (hi - lo) / (count - 1) : 0;
      for (let i = 0; i < count; i++) {
        const s = lo + gap * i;
        const pts = line.map(([x, y, nx, ny, w]) => [cx + (x + nx * w * s) * k, cy + (y + ny * w * s) * k]);
        const bits = [];
        let on = r() < 0.5;
        while (bits.length < n) { const run = 1 + Math.floor(r() * 4); for (let j = 0; j < run; j++) bits.push(on ? 1 : 0); on = !on; }
        const lane = { pts, bits: bits.slice(0, n), kind, bi, speed: speed * (1 + 0.2 * Math.sin(i * 2.4)) * k / step,
          flow: r() * n, wave: r() * n, waveSpeed: (0.5 + r()) * 6 };
        lanes.push(lane);
        if (!lanesOf.has(bi)) lanesOf.set(bi, []);
        lanesOf.get(bi).push(lane);
      }
    });
    // 0 和 1 的小图:每种墨各一张,画的时候只改透明度
    const px = step + 1;
    const glyph = {};
    for (const [kind, color] of Object.entries(ink)) {
      glyph[kind] = ["0", "1"].map((d) => {
        const c = document.createElement("canvas");
        c.width = c.height = Math.ceil(px * 1.6 * dpr);
        const g = c.getContext("2d");
        g.scale(dpr, dpr);
        g.fillStyle = color;
        g.font = `600 ${px}px "JetBrains Mono", ui-monospace, monospace`;
        g.textBaseline = "middle"; g.textAlign = "center";
        g.fillText(d, px * 0.8, px * 0.8);
        return c;
      });
    }
    // 碎屑:带子外面零零星星的小点,画一次
    const debris = [];
    for (let i = 0; i < 160; i++) {
      const [x, y, nx, ny, w] = line[Math.floor(r() * n)];
      const s = (r() < 0.5 ? -1 : 1) * (1.15 + r() * 0.9);
      debris.push([cx + (x + nx * w * s) * k, cy + (y + ny * w * s) * k, r()]);
    }
    S = { ctx, W, H, k, lanes, glyph, px, n, cx, cy, debris, line };
  }
  const L0 = centreLine(800).L;

  function draw(now) {
    const { ctx, W, H, lanes, glyph, px, n, cx, cy, debris, k } = S;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(31,30,29,.28)";
    for (const [x, y, a] of debris) { ctx.globalAlpha = 0.3 + a * 0.5; ctx.fillRect(x, y, 1.2, 1.2); }
    const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0;
    lastDraw = now;
    const crestLen = n / 7;
    for (const lane of lanes) {
      lane.flow = (lane.flow + lane.speed * dt) % n;
      lane.wave = (lane.wave + lane.waveSpeed * dt) % n;
      const dim = hover !== null && hover !== lane.bi;
      const hot = hover === lane.bi;
      const g = glyph[lane.kind];
      const o = lane.flow, base = Math.floor(o), f = o - base;
      for (let i = 0; i < n; i++) {
        const a = lane.pts[(i + base) % n], b = lane.pts[(i + base + 1) % n];
        const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        const ph = ((i + base - lane.wave) % crestLen + crestLen) % crestLen / crestLen;
        const crest = ph < 0.42 ? Math.sin(ph / 0.42 * Math.PI) : 0;
        let alpha = 0.22 + 0.7 * crest;
        if (dim) alpha *= 0.25;
        if (hot) alpha = Math.min(1, alpha + 0.35);
        ctx.globalAlpha = alpha;
        ctx.drawImage(g[lane.bits[i]], x - px * 0.8, y - px * 0.8, px * 1.6, px * 1.6);
      }
    }
    ctx.globalAlpha = 1;
    // 交叉点上的星
    const s = 9 * Math.max(0.8, k) * (1 + 0.12 * Math.sin(now / 500));
    ctx.fillStyle = opt.line || "#D97757";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? s * 0.28 : s, ang = i * Math.PI / 4 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function frame(now) {
    if (!visible) { running = false; return; }
    if (now - lastDraw > 1000 / 24 || !lastDraw) draw(now);
    requestAnimationFrame(frame);
  }
  function start() { if (!running && !reduce) { running = true; requestAnimationFrame(frame); } }

  // 鼠标在哪一束上:离中心线多远、在法向的哪一侧
  canvas.addEventListener("pointermove", (e) => {
    if (!S) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - S.cx) / S.k, my = (e.clientY - rect.top - S.cy) / S.k;
    let best = null, bd = Infinity;
    for (let i = 0; i < S.line.length; i += 2) {
      const p = S.line[i], d = (p[0] - mx) ** 2 + (p[1] - my) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    const [x, y, nx, ny, w] = best;
    const s = ((mx - x) * nx + (my - y) * ny) / Math.max(1, w);
    let bi = null;
    if (Math.sqrt(bd) < w + 6) {
      let gap = Infinity;
      BUNDLES.forEach(([, lo, hi], i) => { const c = (lo + hi) / 2, d = Math.abs(s - c); if (d < gap) { gap = d; bi = i; } });
    }
    if (bi !== hover) {
      hover = bi;
      showTip(bi, e.clientX - rect.left, e.clientY - rect.top);
      if (reduce) draw(performance.now());
    } else if (tip && bi !== null) moveTip(e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener("pointerleave", () => { hover = null; showTip(null); if (reduce) draw(performance.now()); });

  const seen = {};
  function showTip(bi, x, y) {
    if (!tip) return;
    if (bi === null) { tip.hidden = true; return; }
    const tier = TIER_OF[BUNDLES[bi][3]];
    const T = opt.tiers?.[tier];
    if (!T) { tip.hidden = true; return; }
    const ex = T.examples || [];
    seen[tier] = ((seen[tier] ?? -1) + 1) % Math.max(1, ex.length);
    tip.querySelector("[data-tip-name]").textContent = T.name;
    tip.querySelector("[data-tip-note]").textContent = T.note;
    tip.querySelector("[data-tip-ex]").textContent = ex[seen[tier]] || "";
    tip.style.setProperty("--tc", ink[BUNDLES[bi][3]]);
    tip.hidden = false;
    moveTip(x, y);
  }
  function moveTip(x, y) {
    const pw = canvas.clientWidth, tw = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(pw - tw, x - tw / 2))}px`;
    tip.style.top = `${y + 18}px`;
  }

  build();
  draw(performance.now());
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(performance.now()); }, 150); });
}

// ─────────────────────────── 玩家页:糊过的星空 ───────────────────────────
// level = round(log2(1 + 记得的条数)),0..12。只用这一个数,星的位置是用玩家 id 撒的,和她记了什么无关。
export function stars(canvas, { seed = "x", level = null, color = "#D97757" } = {}) {
  const { ctx, W, H } = fit(canvas);
  const k = Math.min((W - 16) / (2 * (A + WMAX)), (H - 16) / (B * 1.2));
  const cx = W / 2, cy = H / 2;
  const { line } = centreLine(900);
  const r = rng(seed);
  ctx.clearRect(0, 0, W, H);
  const known = Number.isFinite(level);
  const lv = known ? Math.max(0, Math.min(12, level)) : 0;
  // 0 档也留一圈很淡的轮廓:宫殿在,只是还空着
  const count = known ? Math.round(40 + 22 * 2 ** (lv * 0.62)) : 150;
  const palette = known ? [color, "#FFF6E8", "#F3D9B1", "#BFD3FF"] : ["#B9B1A6"];
  for (let i = 0; i < count; i++) {
    const [x, y, nx, ny, w] = line[Math.floor(r() * line.length)];
    const s = (r() * 2 - 1) * 1.25;
    const px = cx + (x + nx * w * s) * k + (r() - 0.5) * 3;
    const py = cy + (y + ny * w * s) * k + (r() - 0.5) * 3;
    const big = r() < (known ? 0.08 : 0.02);
    const rad = big ? 1.6 + r() * 1.8 : 0.5 + r() * 1.1;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad * 3);
    const c = palette[Math.floor(r() * palette.length)];
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = known ? 0.35 + r() * 0.65 : 0.3 + r() * 0.35;
    ctx.fillStyle = g;
    ctx.fillRect(px - rad * 3, py - rad * 3, rad * 6, rad * 6);
  }
  ctx.globalAlpha = 1;
}

for (const c of document.querySelectorAll('canvas[data-ring="live"]')) live(c);
