// 每一页都用:头顶牌子敲字、点角色、语言记忆、菜单收起、漫画大图。只用 textContent,不拼 HTML。

import { imageReader } from "./image-reader.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Browsers can drag a parent hyperlink, then issue a click when the native
// drag is cancelled. Keep an ordinary click, a touch scroll and the pet's own drag intact.
function protectArt() {
  for (const image of document.images) image.draggable = false;
  let press = null, draggedControl = null;
  document.addEventListener("pointerdown", event => {
    draggedControl = null;
    const image = event.target.closest("img");
    press = image && event.button === 0 ? {
      image, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
      control: event.pointerType === "mouse" ? image.closest("a[href],button,[role=button],summary") : null,
    } : null;
  }, true);
  function track(event) {
    if (press?.control && event.pointerId === press.id && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6)
      press.moved = true;
  }
  document.addEventListener("pointermove", track, { capture: true, passive: true });
  document.addEventListener("pointerup", event => {
    if (event.pointerId !== press?.id) return;
    track(event);
    if (press.moved) draggedControl = press.control;
    press = null;
  }, true);
  document.addEventListener("pointercancel", () => { press = null; }, true);
  document.addEventListener("dragstart", event => {
    if (event.target instanceof HTMLImageElement || (press && event.target.contains(press.image))) {
      event.preventDefault();
      if (press?.control) press.moved = true;
    }
  });
  document.addEventListener("click", event => {
    const skip = draggedControl;
    draggedControl = null;
    if (event.detail && skip?.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// ── 头顶的牌子:删掉旧词、一个字一个字敲新词、停一会儿(和 App 的 loading.Tag 一个节奏) ──
function tags() {
  const list = [...document.querySelectorAll(".tag[data-words]")].map((el) => {
    let words = [];
    try { words = JSON.parse(el.dataset.words || "[]"); } catch { /* 字坏了就不动 */ }
    return { el, text: el.querySelector(".tag-text"), words, i: 0, shown: el.querySelector(".tag-text")?.textContent || "", target: "", mode: "hold", wait: 1400 + Math.random() * 1600 };
  }).filter((x) => x.text && x.words.length > 1);
  if (!list.length || reduce) return;
  setInterval(() => {
    for (const s of list) {
      if (s.mode === "hold") {
        s.wait -= 60;
        if (s.wait <= 0) { s.i = (s.i + 1 + Math.floor(Math.random() * 3)) % s.words.length; s.target = s.words[s.i]; s.mode = "erase"; }
      } else if (s.mode === "erase") {
        s.shown = [...s.shown].slice(0, -1).join("");
        if (!s.shown) s.mode = "type";
      } else {
        const want = [...s.target];
        s.shown = want.slice(0, [...s.shown].length + 1).join("");
        if (s.shown === s.target) { s.mode = "hold"; s.wait = 2200 + Math.random() * 1800; }
      }
      s.text.textContent = s.shown;
    }
  }, 60);
}

// ── 点角色:跳一下、冒一句她的台词;连点会生气;长按冒爱心 ──
function pokes() {
  const buttons = document.querySelectorAll(".poke");
  if (!buttons.length) return;
  let active, timer;
  const bar = document.querySelector(".topbar");
  function hush() {
    clearTimeout(timer);
    active?.say.classList.remove("on");
    active = null;
  }
  function place() {
    if (!active) return;
    const { fig, say } = active;
    const r = fig.getBoundingClientRect(), style = getComputedStyle(fig);
    const unit = r.width / Number(style.getPropertyValue("--nw"));
    const foot = r.bottom - Number(style.getPropertyValue("--nb")) * unit;
    const head = foot - Number(style.getPropertyValue("--rise")) * unit;
    const roof = Math.max(8, (bar?.getBoundingClientRect().bottom || 0) + 8);
    if (foot < roof || head >= innerHeight || r.right <= 0 || r.left >= innerWidth) return hush();
    const middle = r.left + r.width / 2 - Number(style.getPropertyValue("--body-shift")) * unit;
    const w = say.offsetWidth, h = say.offsetHeight;
    const left = Math.max(8, Math.min(middle - w/2, document.documentElement.clientWidth - w - 8));
    const above = head - h - 20 >= roof;
    const top = above ? head-h-20 : Math.max(roof, Math.min(foot+10, innerHeight-h-9));
    say.style.left = left + "px"; say.style.top = top + "px";
    say.style.setProperty("--tail", Math.max(12, Math.min(w-20, middle-left)) + "px");
    say.toggleAttribute("data-below", !above);
  }
  for (const b of buttons) {
    let lines = [];
    try { lines = JSON.parse(b.dataset.lines || "[]"); } catch { /* 没台词就只跳 */ }
    const say = b.querySelector(".poke-say");
    const fig = b.querySelector("img.fig");
    if (say) document.body.appendChild(say);
    let taps = [], press = 0, last = -1;
    const pop = text => {
      if (!say || !text || !fig) return;
      hush(); active = { say, fig };
      say.classList.add("on"); say.textContent = text; place();
      timer = setTimeout(hush, 3000);
    };
    b.addEventListener("click", () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 1500).concat(now);
      const mad = taps.length >= 4;
      b.classList.remove("hop", "mad");
      void b.offsetWidth;
      b.classList.add(mad ? "mad" : "hop");
      if (mad) { pop("……"); return; }
      if (lines.length) {
        let k = Math.floor(Math.random() * lines.length);
        if (k === last && lines.length > 1) k = (k + 1) % lines.length;
        last = k;
        pop(lines[k]);
      }
    });
    b.addEventListener("pointerdown", () => {
      press = setTimeout(() => {
        const img = document.createElement("img");
        img.src = "/tmi/img/marks/heart.webp";
        img.alt = "";
        img.className = "poke-heart";
        img.style.left = `${40 + Math.random() * 20}%`;
        img.style.top = "10%";
        b.appendChild(img);
        setTimeout(() => img.remove(), 1200);
      }, 650);
    });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => clearTimeout(press));
  }
  window.addEventListener("resize", place, { passive: true });
  document.addEventListener("scroll", place, { capture: true, passive: true });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hush(); });
}

// ── 记住选过的语言;点外面收起菜单 ──
function chrome() {
  const links = [...document.querySelectorAll("a[data-lang]")];
  const fields = document.querySelector("[data-player-page]") ? ["id"]
    : document.querySelector("[data-board-page]") ? ["tab", "page"] : [];
  function syncLanguageLinks() {
    const current = new URLSearchParams(location.search);
    for (const link of links) {
      const url = new URL(link.href);
      for (const field of fields) {
        if (current.has(field)) url.searchParams.set(field, current.get(field));
        else url.searchParams.delete(field);
      }
      url.hash = location.hash;
      link.href = url.href;
    }
  }
  syncLanguageLinks();
  window.addEventListener("hashchange", syncLanguageLinks);
  window.addEventListener("pageshow", syncLanguageLinks);
  window.addEventListener("board:navigated", syncLanguageLinks);
  for (const a of links) {
    a.addEventListener("click", () => { try { localStorage.setItem("lang", a.dataset.lang); } catch { /* 无痕窗口存不了也没关系 */ } });
  }
  document.addEventListener("click", (e) => {
    for (const d of document.querySelectorAll("details.menu[open], details.lang[open]")) if (!d.contains(e.target)) d.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      for (const d of document.querySelectorAll("details.menu[open], details.lang[open]")) {
        const hadFocus = d.contains(document.activeElement);
        d.open = false;
        if (hadFocus) d.querySelector("summary").focus();
      }
    }
  });
}

// Each cover is also a direct link when the reader is unavailable.
function lightbox() {
  const covers = [...document.querySelectorAll("[data-lightbox] [data-full]")];
  if (!covers.length) return;
  const reader = imageReader(document.querySelector(".comic-reader"), covers);
  if (!reader) return;
  covers.forEach((link, i) => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    reader.open(i, link);
  }));
}



// ── 账本那个大数:滚到眼前时从 0 数上去 ──
function counters() {
  for (const el of document.querySelectorAll("[data-count]")) {
    const m = el.textContent.trim().match(/^([\d.,]+)(.*)$/);
    if (!m || reduce) continue;
    const target = Number(m[1].replace(/,/g, "")), digits = (m[1].split(".")[1] || "").length, rest = m[2];
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1100);
        el.textContent = (target * (1 - (1 - k) ** 3)).toFixed(digits) + rest;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
  }
}

protectArt();
tags();
pokes();
chrome();
lightbox();
counters();
