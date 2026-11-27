// The three dots in the reply supply all the pigment in the first drawing.
const W = 500, H = 296, DURATION = 4350;
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
function noise(n) { const x = Math.sin(n * 318.17 + 7.21) * 19438.13; return x - Math.floor(x); }

function inkFrom(frame, img) {
  const sheet = document.createElement("canvas");
  sheet.width = W; sheet.height = H;
  const brush = sheet.getContext("2d", { willReadFrequently: true });
  brush.drawImage(img, frame.x, frame.y, frame.w, frame.h);
  const pixels = brush.getImageData(0, 0, W, H).data;
  const flecks = [];
  // Sample the actual hair, blouse and book, down to their original outlines.
  for (let y = 2; y < 250; y += 4) {
    for (let x = 194 + (y % 3); x < 485; x += 4) {
      const p = (y * W + x) * 4;
      if (pixels[p + 3] < 125) continue;
      const n = flecks.length;
      flecks.push({ x, y, dot: n % 3, spread: noise(n + 3), bend: noise(n + 6) - .5,
        lag: .09 * noise(n) + .055 * (y / H), color: `rgb(${pixels[p]},${pixels[p+1]},${pixels[p+2]})` });
    }
  }
  return flecks;
}

function animate(root) {
  const scene = root.querySelector(".arrival-scene"), canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d"), replay = root.querySelector("button");
  if (!ctx || typeof IntersectionObserver !== "function") return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const frames = JSON.parse(root.dataset.frames);
  const typing = [...root.querySelectorAll(".arrival-typing i")];
  let images, flecks, dots, pending, visible = false, started = false, finished = false;
  let elapsed = 0, last = null, raf = 0;

  function size() {
    const rect = scene.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    dots = typing.map(el => {
      const dot = el.getBoundingClientRect();
      return { x: (dot.left + dot.width / 2 - rect.left) * W / rect.width,
        y: (dot.top + dot.height / 2 - rect.top) * H / rect.height };
    });
    if (started && !finished) paint(elapsed / DURATION);
  }

  function paint(t) {
    ctx.clearRect(0, 0, W, H);
    const release = ease((t - .16) / .10);
    root.style.setProperty("--typing", 1 - release);
    root.style.setProperty("--land", .55 * ease((t - .38) / .27));
    root.style.setProperty("--answer", ease((t - .70) / .12));
    root.style.setProperty("--entry", ease((t - .86) / .06));
    if (t < .77 && release > 0) {
      ctx.globalAlpha = release * (1 - ease((t - .60) / .16));
      for (const grain of flecks) {
        const a = ease((t - .16 - grain.lag) / .36), b = 1 - a;
        const source = dots[grain.dot];
        // The first pull follows the bubble tail. The red and indigo arc opens into the whole silhouette.
        const x = b*b*b*source.x + 3*b*b*a*(source.x + 59)
          + 3*b*a*a*(grain.x - 55 + grain.bend * 68) + a*a*a*grain.x;
        const y = b*b*b*source.y + 3*b*b*a*(source.y + 44 + grain.bend * 44)
          + 3*b*a*a*(grain.y - 96 - grain.spread * 52) + a*a*a*grain.y;
        ctx.fillStyle = a < .20 ? "#aa593e" : grain.color;
        const radius = 1.25 + grain.spread * 1.25;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fill();
      }
    }
    if (t > .54) {
      ctx.globalAlpha = ease((t - .54) / .14);
      // Writes one line, finishes it, then tips the open ledger up to show you.
      const i = t < .73 ? 0 : t < .86 ? 1 : 2;
      const f = frames[i];
      const settle = i === 2 ? 2.3 * Math.sin(clamp((t - .86) / .105) * Math.PI) : 0;
      root.style.setProperty("--entry-rise", (-settle / 5) + "cqi");
      ctx.drawImage(images[i], f.x, f.y - settle, f.w, f.h);
    }
    ctx.globalAlpha = 1;
  }

  function still() {
    cancelAnimationFrame(raf); raf = 0; last = null;
    finished = true;
    canvas.hidden = true;
    root.removeAttribute("data-running");
    replay.hidden = motion.matches || !images;
  }
  function tick(now) {
    raf = 0;
    if (!visible || document.hidden || finished) return;
    if (last !== null) elapsed += Math.max(0, now - last);
    last = now;
    if (elapsed >= DURATION) return still();
    paint(elapsed / DURATION);
    raf = requestAnimationFrame(tick);
  }
  function activity() {
    if (!visible || document.hidden || motion.matches) {
      cancelAnimationFrame(raf); raf = 0; last = null;
      return;
    }
    if (images && !finished && !raf) raf = requestAnimationFrame(tick);
  }
  function play() {
    if (!images || motion.matches) return;
    elapsed = 0; last = null; started = true; finished = false;
    root.setAttribute("data-running", "");
    canvas.hidden = false;
    size(); activity();
  }
  async function load() {
    if (motion.matches || pending) return;
    pending = Promise.all(frames.map(async f => {
      const img = new Image(); img.src = f.src; await img.decode(); return img;
    }));
    try {
      images = await pending;
      flecks = inkFrom(frames[0], images[0]);
      if (motion.matches) still(); else play();
    } catch { images = null; still(); }
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .24;
    if (visible && !pending && !started) load();
    activity();
  }, { threshold: [0, .24] });
  observer.observe(scene);
  const nearby = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    nearby.disconnect();
    load();
  }, { rootMargin: "320px" });
  nearby.observe(scene);
  if (typeof ResizeObserver === "function") new ResizeObserver(size).observe(scene);
  else addEventListener("resize", size);
  motion.addEventListener("change", () => {
    if (motion.matches) still();
    else if (images) { still(); }
    else if (visible) load();
  });
  document.addEventListener("visibilitychange", activity);
  replay.addEventListener("click", play);
}

document.querySelectorAll("[data-arrival]").forEach(animate);
