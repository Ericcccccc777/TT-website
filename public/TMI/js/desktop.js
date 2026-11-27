// Sample the original artwork in its own coordinates. Both layers keep the exact
// source aspect, including transparent margins, through every viewport change.
const motion = matchMedia("(prefers-reduced-motion: reduce)");

function drawGlyphs(image, canvas, cols) {
  const w = image.naturalWidth, h = image.naturalHeight;
  const rows = Math.max(1, Math.round(cols * h / w * .65));
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const read = sample.getContext("2d", { willReadFrequently: true });
  const ink = canvas.getContext("2d");
  if (!read || !ink) return false;
  read.drawImage(image, 0, 0, cols, rows);
  const pixels = read.getImageData(0, 0, cols, rows).data;
  // A multiple of the source dimensions keeps the letters sharp even on a retina display.
  canvas.width = w * 2;
  canvas.height = h * 2;
  const dx = canvas.width / cols, dy = canvas.height / rows;
  ink.font = `700 ${dy * .94}px monospace`;
  ink.textAlign = "center";
  ink.textBaseline = "middle";
  const ramp = [".1", ":1", "01", "10", "08", "#8", "@#"];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      if (pixels[i + 3] < 52) continue;
      const light = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
      const pair = ramp[Math.round((1 - light) * (ramp.length - 1))];
      const glyph = pair[(x + y) % 2];
      ink.fillStyle = `rgb(${Math.round(26 + pixels[i] * .44)} ${Math.round(23 + pixels[i+1] * .44)} ${Math.round(20 + pixels[i+2] * .44)})`;
      ink.globalAlpha = pixels[i + 3] / 255;
      ink.fillText(glyph, (x + .5) * dx, (y + .5) * dy, dx);
    }
  }
  return true;
}

function printingPress(root) {
  const choices = [...root.querySelectorAll("[data-portrait-choice]")];
  const castLinks = document.querySelectorAll("a[data-cast-link]");
  const prints = new Map([...root.querySelectorAll("[data-print]")].map(el => [el.dataset.print, {
    el, image: el.querySelector("img"), canvas: el.querySelector("canvas"),
    surface: el.querySelector(".print-image"), poses: JSON.parse(el.dataset.poses),
  }]));
  const name = root.querySelector("[data-print-name]"), caption = root.querySelector("[data-print-action]");
  let person = choices[0].dataset.portraitChoice, index = 0, version = 0;
  let phase = "waiting", visible = false, nextOnReturn = false, animations = [], reel;
  const canPlay = () => visible && !document.hidden && !motion.matches;

  function setCaption(action) {
    const previous = caption.dataset.action || caption.textContent;
    caption.dataset.action = action;
    reel?.cancel();
    caption.textContent = action;
    if (!previous || previous === action || !canPlay()) return;
    const strip = document.createElement("span");
    strip.className = "action-reel";
    for (const text of [previous, "01 10 01", action]) {
      const face = document.createElement("span");
      face.textContent = text;
      strip.append(face);
    }
    caption.replaceChildren(strip);
    reel = strip.animate([{ transform: "translateY(0)" }, { transform: "translateY(-66.6667%)" }],
      { duration: 340, easing: "cubic-bezier(.2,.65,.2,1)" });
    reel.onfinish = () => { if (caption.firstChild === strip) caption.textContent = action; };
  }

  function sweep(art) {
    phase = "printing";
    const stops = [[0, 0], [.15, 0], [.43, 100], [.58, 100], [.89, 0], [1, 0]];
    function cuts(paper) {
      return stops.map(([offset, cut]) => ({
        offset, easing: "ease-in-out",
        clipPath: paper ? `inset(0 0 0 ${cut}%)` : `inset(0 ${100-cut}% 0 0)`,
      }));
    }
    const options = { duration: 3900 };
    animations = [art.image.animate(cuts(true), options), art.canvas.animate(cuts(false), options)];
    const current = version;
    animations[0].onfinish = () => {
      if (current !== version) return;
      animations = [];
      phase = "finished";
    };
  }

  function updateInk(art) {
    const src = art.image.getAttribute("src");
    // Keep individual digits legible in a narrow frame; quantising avoids work
    // for every pixel of a window resize.
    const columns = Math.max(24, Math.min(64, 4 * Math.round(art.surface.getBoundingClientRect().width / 17)));
    if (art.canvas.dataset.frame === src && Number(art.canvas.dataset.columns) === columns) return true;
    if (!drawGlyphs(art.image, art.canvas, columns)) return false;
    art.canvas.dataset.frame = src;
    art.canvas.dataset.columns = String(columns);
    return true;
  }

  async function prepare(art) {
    phase = "loading";
    const current = version;
    try {
      await art.image.decode();
      if (current !== version) return;
      if (!canPlay()) { phase = "waiting"; return; }
      if (updateInk(art)) sweep(art);
      else phase = "finished";
    } catch {
      if (current === version) phase = "finished";
    }
  }

  function sync() {
    if (!canPlay()) {
      animations.forEach(a => a.pause());
      if (reel?.playState === "running") reel.finish();
      return;
    }
    if (phase === "waiting") prepare(prints.get(person));
    else if (phase === "printing") animations.forEach(a => { if (a.playState === "paused") a.play(); });
  }

  function display(id, poseIndex) {
    version++;
    animations.forEach(a => a.cancel());
    animations = [];
    nextOnReturn = false;
    person = id;
    index = poseIndex;
    const art = prints.get(person), pose = art.poses[index];
    for (const [id, print] of prints) print.el.hidden = id !== person;
    for (const choice of choices) {
      const selected = choice.dataset.portraitChoice === person;
      choice.setAttribute("aria-pressed", String(selected));
      if (selected) {
        name.textContent = choice.textContent.trim();
        root.style.setProperty("--person-ink", choice.style.getPropertyValue("--swatch"));
      }
    }
    root.dataset.person = person;
    art.surface.style.cssText = pose.fit;
    art.image.width = pose.w;
    art.image.height = pose.h;
    art.image.alt = art.el.dataset.name + " · " + pose.action;
    if (art.image.getAttribute("src") !== pose.src) art.image.src = pose.src;
    setCaption(pose.action);
    phase = "waiting";
    sync();
  }

  const nextPose = () => (index + 1) % prints.get(person).poses.length;
  for (const choice of choices) choice.addEventListener("click", () => {
    const id = choice.dataset.portraitChoice;
    for (const link of castLinks) link.hash = "portrait-" + id;
    display(id, id === person ? nextPose() : 0);
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .05;
    if (!entry.isIntersecting && phase === "finished") nextOnReturn = true;
    if (visible && nextOnReturn && !motion.matches) display(person, nextPose());
    else sync();
  }, { threshold: [0, .05] }).observe(root.querySelector(".plate"));
  new ResizeObserver(() => {
    if (canPlay() && phase === "printing") updateInk(prints.get(person));
  }).observe(root.querySelector(".plate"));
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", () => display(person, index));
  root.querySelector("[data-print-controls]").hidden = false;
  display(person, 0);
}

function workSequence() {
  const stage = document.querySelector("[data-story-stage]"), steps = [...document.querySelectorAll("[data-step]")];
  if (!stage || !steps.length) return;
  const links = [...document.querySelectorAll("[data-step-link]")];
  const states = JSON.parse(document.querySelector("[data-work-states]").dataset.workStates);
  const frames = [...stage.querySelectorAll("[data-day-frame]")], logs = [...stage.querySelectorAll("[data-log]")];
  const status = stage.querySelector("[data-day-status]");
  let active = -1, queued = 0, nearby = false;
  function show(n) {
    if (n === active) return;
    active = n; stage.dataset.activeStep = String(n);
    steps.forEach((s,i) => s.classList.toggle("is-current",i === n));
    frames.forEach((f,i) => { f.hidden = i !== n; });
    logs.forEach((l,i) => { l.hidden = i > n; });
    links.forEach((a,i) => {
      if (i === n) a.setAttribute("aria-current","step"); else a.removeAttribute("aria-current");
    });
    status.textContent = states[n];
  }
  function read() {
    queued = 0;
    const line = innerHeight * .43;
    let n = 0;
    for (let i = 1; i < steps.length; i++) if (steps[i].getBoundingClientRect().top <= line) n = i;
    show(n);
  }
  function schedule() { if (nearby && !queued) queued = requestAnimationFrame(read); }
  const observer = new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (nearby) schedule();
  }, { rootMargin: "25% 0px" });
  observer.observe(stage.closest("section"));
  addEventListener("scroll", schedule, { passive:true });
  addEventListener("resize", schedule);
  addEventListener("pageshow", read);
  read();
}

function chatExamples() {
  const demo = document.querySelector("[data-chat-demo]");
  if (!demo) return;
  const buttons = [...demo.querySelectorAll("[data-chat-choice]")];
  const panels = [...demo.querySelectorAll("[data-conversation]")];
  function select(id) {
    for (const b of buttons) b.setAttribute("aria-pressed", String(id === b.dataset.chatChoice));
    for (const p of panels) p.hidden = p.dataset.conversation !== id;
  }
  select(buttons[0].dataset.chatChoice);
  for (const b of buttons) b.addEventListener("click", () => select(b.dataset.chatChoice));
  demo.querySelector(".talk-choices").hidden = false;
}

const press = document.querySelector("[data-printing-press]");
if (press) printingPress(press);
workSequence();
chatExamples();
