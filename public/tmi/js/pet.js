// 网页右下角的那位:和 App 里一样住在屏幕角上。点她、拖起来甩、右键换人;你翻页、发呆、指着下载按钮,她都有反应。
// 只用 textContent;字和图都由构建时塞进页面的 #pet-data 给。选了谁、收没收起来记在本机(localStorage),不出网。

const DATA_EL = document.getElementById("pet-data");
if (DATA_EL) boot(JSON.parse(DATA_EL.textContent));

function boot(D) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)").matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 无痕窗口存不了,只是下次不记得 */ } },
  };
  const session = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* 同上 */ } },
  };

  const MAIN = Object.keys(D.frames);
  let who = MAIN.includes(store.get("pet")) ? store.get("pet") : (MAIN.includes(D.who) ? D.who : MAIN[0]);
  const scale = () => coarse || innerWidth < 720 ? 0.27 : 0.4;          // 画布 1px 在屏幕上多大
  const WALK = ["walk_a", "walk_b", "walk_c", "walk_b"];
  const POINT_FLIP = { claude: false, codex: true, deepseek: true };   // 教鞭朝左:cLAudE 本来就朝左,另两位要翻过来

  // ── DOM ──
  const root = document.createElement("div");
  root.className = "pet";
  root.hidden = true;
  root.setAttribute("role", "button");
  root.setAttribute("aria-keyshortcuts", "Shift+F10");
  root.tabIndex = 0;
  const tagEl = document.createElement("span");
  tagEl.className = "tag pet-tag";
  tagEl.hidden = true;
  const tagDot = document.createElement("span"); tagDot.className = "tag-dot";
  const tagText = document.createElement("span"); tagText.className = "tag-text";
  tagEl.append(tagDot, tagText);
  const sayEl = document.createElement("span"); sayEl.className = "pet-say"; sayEl.setAttribute("aria-live", "polite");
  const markEl = document.createElement("img"); markEl.className = "pet-mark"; markEl.alt = ""; markEl.hidden = true;
  const img = document.createElement("img"); img.className = "pet-img"; img.alt = ""; img.draggable = false;
  root.append(tagEl, sayEl, markEl, img);
  const call = document.createElement("button");
  call.type = "button"; call.className = "pet-call"; call.hidden = true;
  const callImg = document.createElement("img"); callImg.alt = ""; callImg.width = 28; callImg.height = 28;
  const callText = document.createElement("span");
  call.append(callImg, callText);
  const menu = document.createElement("div");
  menu.className = "pet-menu"; menu.setAttribute("role", "menu"); menu.hidden = true;
  document.body.append(root, call, menu);

  // ── 状态 ──
  const P = { x: innerWidth + 80, y: innerHeight, vx: 0, vy: 0, face: -1, state: "idle", frame: "stand", target: null };
  let w = 0, h = 0, nb = 0, axis = 0, flipped = false, frameIdx = 0, frameAt = 0, raf = 0, last = 0, sayTimer = 0, lastInput = performance.now();
  const said = {};

  const t = (k) => D.say[who]?.[k] || "";
  const fmt = (s, o) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ""));
  const home = () => innerWidth - (coarse || innerWidth < 720 ? 44 : 68);

  function setFrame(name, flip = false) {
    const box = D.frames[who][name] || D.frames[who].stand;
    if (!D.frames[who][name]) name = "stand";
    P.frame = name;
    const fs = scale();
    [w, h, nb] = [box[0] * fs, box[1] * fs, box[2] * fs];
    flipped = flip;
    axis = (flip ? box[0] - box[3] : box[3]) * fs;
    const src = `/tmi/img/chars/${who}_${name}.webp`;
    if (img.getAttribute("src") !== src) img.src = src;
    img.style.width = `${w}px`;
    img.style.transform = flip ? "scaleX(-1)" : "";
    place();
  }

  function place() {
    // P.x = 脚的中线,P.y = 脚踩的地方。图片的底边比脚低 nb。
    root.style.transform = `translate(${Math.round(P.x - axis)}px, ${Math.round(P.y + nb - h)}px)`;
    root.style.width = `${w}px`;
    root.style.height = `${h}px`;
  }

  function say(text, { ms = 2600, mark = "", sticker = "" } = {}) {
    if (!text) return;
    sayEl.textContent = text;
    sayEl.classList.add("on");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => sayEl.classList.remove("on"), ms);
    showMark(mark, ms, sticker);
  }
  function once(key, gapMs) {
    const now = performance.now();
    if (said[key] && now - said[key] < gapMs) return false;
    said[key] = now;
    return true;
  }
  let markTimer = 0;
  function showMark(name, ms = 2400, sticker = "") {
    clearTimeout(markTimer);
    const received = typeof sticker === "string" && /^v[1-9]\d*\/(claude|codex|deepseek)_[a-z0-9_]+\.webp$/.test(sticker);
    markEl.classList.toggle("received-sticker", received);
    if (!name && !received) { markEl.hidden = true; return; }
    if (received) {
      const box = root.getBoundingClientRect();
      markEl.classList.toggle("sticker-left", box.left > innerWidth - box.right);
      markEl.src = "/tmi/img/stickers/" + sticker;
    } else {
      markEl.src = `/tmi/img/marks/${name}.webp`;
    }
    markEl.hidden = false;
    markTimer = setTimeout(() => { markEl.hidden = true; }, ms);
  }

  // ── 动起来 ──
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (P.state === "walk") {
      const dx = P.target - P.x;
      const step = 70 * dt;
      if (Math.abs(dx) <= step) {
        finishWalk();
      } else {
        P.face = dx > 0 ? 1 : -1;
        P.x += Math.sign(dx) * step;
        if (now - frameAt > 150) { frameAt = now; frameIdx = (frameIdx + 1) % WALK.length; }
        setFrame(WALK[frameIdx], P.face < 0);       // 走路图朝右,往左走就翻过来
      }
    } else if (P.state === "air") {
      P.vy += 2600 * dt;
      P.x += P.vx * dt;
      P.y += P.vy * dt;
      if (P.x < axis) { P.x = axis; P.vx = -P.vx * 0.5; }
      if (P.x > innerWidth - w + axis) { P.x = innerWidth - w + axis; P.vx = -P.vx * 0.5; }
      if (P.y < h * 0.9) { P.y = h * 0.9; P.vy = Math.abs(P.vy) * 0.3; }
      if (P.y >= innerHeight) {
        const hard = Math.abs(P.vy) > 1500 || Math.abs(P.vx) > 1100;
        P.y = innerHeight;
        P.vx = 0; P.vy = 0;
        land(hard);
      } else {
        setFrame(Math.abs(P.vy) < 500 && Math.abs(P.vx) < 500 ? "fly" : "tuck", P.vx > 0);
      }
    }
    if (P.state === "walk" || P.state === "air") raf = requestAnimationFrame(loop);
    else last = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  function finishWalk() {
    P.x = P.target;
    P.state = "idle";
    setFrame(P.after || "stand", false);
    const arrived = P.then;
    P.after = null; P.then = null;
    arrived?.();
  }
  function walkTo(x, after, then) {
    P.target = Math.max(axis, Math.min(innerWidth - w + axis, x));
    P.after = after; P.then = then;
    P.state = "walk";
    if (motion.matches) finishWalk();
    else kick();
  }
  function settleDrop() {
    P.y = innerHeight;
    P.vx = 0; P.vy = 0;
    walkTo(P.x, "stand");
  }
  motion.addEventListener("change", () => {
    if (!motion.matches || root.hidden) return;
    if (P.state === "walk") finishWalk();
    else if (P.state === "air") settleDrop();
  });

  function land(hard) {
    P.state = "busy";
    if (hard) {
      setFrame("brace", false);
      say(t("dizzy"), { mark: "dizzy", ms: 2200 });
      setTimeout(() => { P.state = "idle"; walkTo(home()); }, 2200);
    } else {
      setFrame("stand", false);
      setTimeout(() => { if (P.state === "busy") { P.state = "idle"; walkTo(home()); } }, 900);
    }
  }

  // ── 点、拖、甩 ──
  let down = null, taps = [], holdTimer, heldMenuTouch = false;
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || down) return;
    root.setPointerCapture(e.pointerId);
    heldMenuTouch = false;
    down = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, dragging: false, menu: false, hist: [] };
    if (e.pointerType === "touch") {
      holdTimer = setTimeout(() => requestMenu(e.clientX, e.clientY), 560);
    }
    wake();
  });
  root.addEventListener("pointermove", (e) => {
    if (down?.id !== e.pointerId || down.menu) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (!down.dragging && moved > 6) {
      clearTimeout(holdTimer);
      down.dragging = true;
      P.state = "held";
      root.classList.add("held");
      setFrame("lift", false);
      if (once("grab", 8000)) say(t("grab"), { ms: 1600 });
    }
    if (down.dragging) {
      // 拎着头顶那一块:鼠标在图的上三分之一
      P.x = e.clientX;
      P.y = e.clientY + h * 0.72 - nb;
      down.hist.push({ x: e.clientX, y: e.clientY, at: performance.now() });
      if (down.hist.length > 6) down.hist.shift();
      place();
    }
  });
  root.addEventListener("pointerup", (e) => {
    if (down?.id !== e.pointerId) return;
    clearTimeout(holdTimer);
    const d = down; down = null;
    root.classList.remove("held");
    if (d.menu) return;
    if (d.dragging) {
      if (motion.matches) { settleDrop(); return; }
      const a = d.hist[0], b = d.hist[d.hist.length - 1];
      const dt = a && b ? Math.max(16, b.at - a.at) / 1000 : 1;
      P.vx = a && b ? Math.max(-2600, Math.min(2600, (b.x - a.x) / dt)) : 0;
      P.vy = a && b ? Math.max(-2600, Math.min(2600, (b.y - a.y) / dt)) : 0;
      P.state = "air";
      kick();
      return;
    }
    poke();
  });
  root.addEventListener("pointercancel", e => {
    if (down?.id !== e.pointerId) return;
    clearTimeout(holdTimer); down = null;
    root.classList.remove("held");
    if (P.state !== "held") return;
    if (motion.matches) settleDrop();
    else { P.state = "air"; kick(); }
  });
  // Touch browsers may synthesize a tap on the menu row now under the released finger.
  root.addEventListener("touchend", e => {
    if (heldMenuTouch) { e.preventDefault(); heldMenuTouch = false; }
  }, { passive: false });

  function poke() {
    const now = performance.now();
    taps = taps.filter((x) => now - x < 1500).concat(now);
    root.classList.remove("hop", "mad");
    void root.offsetWidth;
    if (taps.length >= 4) {
      root.classList.add("mad");
      say(t("mad"), { mark: "anger" });
      return;
    }
    root.classList.add("hop");
    const lines = D.lines[who] || [];
    say(lines[Math.floor(Math.random() * lines.length)] || t("hello"));
  }

  root.addEventListener("dblclick", async (e) => {
    e.preventDefault();
    try {
      const mod = await import("./data.js");
      const s = await mod.stats();
      say(fmt(D.ui.stats, { players: s.players, tokens: mod.fmt(s.tokens) }), { ms: 4200, mark: "sparkle" });
    } catch { /* 取不到就算了 */ }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); openMenu(P.x - 160, P.y - h - 10); }
  });

  // ── 右键菜单:和 App 一样,右键她 ──
  function item(label, fn) {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = label;
    b.tabIndex = -1;
    b.addEventListener("click", () => { closeMenu(true); fn(); });
    return b;
  }
  function openMenu(x, y) {
    const items = [];
    for (const other of MAIN) if (other !== who) items.push(item(fmt(D.ui.switch, { name: D.names[other] }), () => swap(other)));
    items.push(item(D.ui.page, () => { location.href = D.hrefs[who]; }));
    items.push(item(D.ui.sleep, () => sleep()));
    items.push(item(D.ui.hide, () => hide()));
    menu.replaceChildren(...items);
    menu.hidden = false;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(innerWidth - mw - 8, x))}px`;
    menu.style.top = `${Math.max(8, Math.min(innerHeight - mh - 8, y))}px`;
    items[0].focus({ preventScroll: true });
  }
  function requestMenu(x, y) {
    clearTimeout(holdTimer);
    if (down?.dragging) return;
    if (down) { down.menu = true; heldMenuTouch = down.type === "touch"; }
    if (menu.hidden) openMenu(x, y);
  }
  function closeMenu(restoreFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    if (restoreFocus) root.focus({ preventScroll: true });
  }
  root.addEventListener("contextmenu", (e) => { e.preventDefault(); requestMenu(e.clientX, e.clientY); });
  menu.addEventListener("keydown", e => {
    if (e.key === "Tab") { closeMenu(true); return; }
    const items = [...menu.children], i = items.indexOf(document.activeElement), n = items.length;
    const positions = { ArrowDown: (i+1)%n, ArrowUp: (i+n-1)%n, Home: 0, End: n-1 };
    if (!Object.hasOwn(positions, e.key)) return;
    e.preventDefault();
    items[positions[e.key]].focus({ preventScroll: true });
  });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(true); });

  function swap(other) {
    who = other;
    store.set("pet", other);
    root.style.setProperty("--c", D.colors[who]);
    root.classList.remove("poof"); void root.offsetWidth; root.classList.add("poof");
    setFrame("stand", false);
    say(D.lines[who]?.[0] || "", { mark: "sparkle" });
    setupTag();
  }

  // ── 收起来 / 叫回来 ──
  function hide() {
    say(D.lines[who]?.[3] || "", { ms: 1400 });
    walkTo(innerWidth + w, "stand", () => {
      const focused = document.activeElement === root;
      root.hidden = true;
      store.set("pet_hidden", "1");
      showCall();
      if (focused) call.focus({ preventScroll: true });
    });
  }
  function showCall() {
    callImg.src = `/tmi/img/avatars/${who}.webp`;
    callText.textContent = fmt(D.ui.call, { name: D.names[who] });
    call.style.setProperty("--c", D.colors[who]);
    call.hidden = false;
  }
  call.addEventListener("click", () => {
    call.hidden = true;
    store.set("pet_hidden", "");
    enter(() => say(D.lines[who]?.[0] || ""));
    root.focus({ preventScroll: true });
  });

  // ── 睡觉:发呆太久,或者你叫她睡 ──
  function sleep() {
    if (P.state !== "idle") return;
    P.state = "sleep";
    setFrame("sleep", false);
    showMark("zzz", 1e9);
  }
  function wake() {
    lastInput = performance.now();
    if (P.state !== "sleep") return;
    P.state = "idle";
    showMark("");
    setFrame("stand", false);
    say(t("wake"));
  }
  setInterval(() => {
    if (!root.hidden && P.state === "idle" && performance.now() - lastInput > 45000) sleep();
  }, 5000);

  // ── 你在页面上做什么,她看着 ──
  let near = false, moveQueued = false, mx = -1, my = -1;
  document.addEventListener("pointermove", (e) => {
    if (root.hidden) return;
    mx = e.clientX; my = e.clientY;
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(() => {
      moveQueued = false;
      lastInput = performance.now();
      if (P.state === "sleep") { if (Math.hypot(mx - P.x, my - (P.y - h / 2)) < 120) wake(); return; }
      if (root.hidden || P.state !== "idle" || coarse) return;
      const d = Math.hypot(mx - P.x, my - (P.y - h / 2));
      if (d < 170 && !near) { near = true; setFrame("summon", false); }
      else if (d > 230 && near) { near = false; setFrame("stand", false); }
    });
  }, { passive: true });

  // 指着下载按钮
  document.addEventListener("pointerover", (e) => {
    if (P.state !== "idle" || coarse || root.hidden) return;
    const a = e.target.closest?.('a.btn-primary, a[href*="/download/"]');
    if (a && !root.contains(a)) {
      const r = a.getBoundingClientRect();
      if (r.right < P.x) {
        near = false;
        setFrame("slide_b", POINT_FLIP[who]);
        if (once("download", 30000)) say(t("download"));
      }
      return;
    }
    const other = e.target.closest?.(".poke[data-who], .cast-card");
    if (other) {
      const ow = other.dataset.who || other.getAttribute("href")?.match(/characters\/(\w+)/)?.[1];
      if (ow && ow !== who && MAIN.includes(ow) && once("rival", 25000)) say(t("rival"));
    }
  });
  document.addEventListener("pointerout", (e) => {
    if (P.frame === "slide_b" && P.state === "idle" && e.target.closest?.('a.btn-primary, a[href*="/download/"]')) setFrame("stand", false);
  });

  // 翻页:牌子跟着你一个词一个词地换;翻太快她撑不住
  let lastY = scrollY, lastScrollAt = performance.now(), scrollStop = 0, wordAt = 0, wordI = 0;
  function setupTag() {
    root.setAttribute("aria-label", fmt(coarse ? D.ui.touchLabel || D.ui.label : D.ui.label, { name: D.names[who] }));
    tagEl.style.setProperty("--c", D.colors[who]);
    tagText.textContent = D.words[who]?.[0] || "";
  }
  addEventListener("scroll", () => {
    const now = performance.now();
    const v = Math.abs(scrollY - lastY) / Math.max(16, now - lastScrollAt) * 1000;
    lastY = scrollY; lastScrollAt = now; lastInput = now;
    if (root.hidden) return;
    if (P.state === "sleep") wake();
    const words = D.words[who] || [];
    if (words.length && now - wordAt > 700) {
      wordAt = now;
      wordI = (wordI + 1) % words.length;
      tagText.textContent = words[wordI];
      tagEl.hidden = false;
    }
    if (v > 4200 && P.state === "idle" && once("scroll", 20000)) {
      setFrame("brace", false);
      say(t("scroll"), { mark: "sweat" });
    }
    clearTimeout(scrollStop);
    scrollStop = setTimeout(() => {
      tagEl.hidden = true;
      if (P.state === "idle" && P.frame === "brace") setFrame("stand", false);
    }, 1400);
  }, { passive: true });

  // 选中一段字
  let selTimer = 0;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(() => {
      const s = String(getSelection?.() || "").trim();
      if (s.length > 8 && !root.hidden && P.state === "idle" && once("select", 60000)) say(t("select"));
    }, 800);
  });

  // 你切走又回来
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 15000 && !root.hidden) { wake(); say(t("back")); }
  });

  // 页面上别的东西让她说一句(表情包点一下就发给她)
  addEventListener("pet:say", (e) => {
    if (root.hidden) return;
    wake();
    say(e.detail?.text || "", { mark: e.detail?.mark || "heart", sticker: e.detail?.sticker });
  });

  // 闲着就在右下角来回走两步
  setInterval(() => {
    if (root.hidden || P.state !== "idle" || near || motion.matches || document.hidden || !menu.hidden) return;
    if (Math.random() < 0.55) {
      const span = Math.min(260, innerWidth * 0.25);
      walkTo(home() - Math.random() * span, "stand");
    }
  }, 9000);

  addEventListener("resize", () => {
    if (root.hidden) return;
    setFrame(P.frame, flipped);
    if (P.state === "idle" || P.state === "sleep" || P.state === "busy") {
      P.y = innerHeight;
      P.x = Math.max(axis, Math.min(P.x, innerWidth - w + axis));
      place();
    }
  });

  // ── 出场 ──
  function enter(greeting) {
    root.hidden = false;
    P.x = motion.matches ? home() : innerWidth + 80;
    P.y = innerHeight;
    setFrame("stand", false);
    walkTo(home(), "stand", greeting);
  }
  root.style.setProperty("--c", D.colors[who]);
  setupTag();
  if (store.get("pet_hidden") === "1") {
    showCall();
    return;
  }
  const first = !session.get("pet_seen");
  const greet = () => {
    if (first) { session.set("pet_seen", "1"); say(D.lines[who]?.[0] || "", { ms: 3200 }); }
  };
  if (motion.matches) enter(greet);
  else setTimeout(() => enter(greet), 900);
}
