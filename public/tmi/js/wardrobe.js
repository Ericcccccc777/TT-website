import { imageReader } from "./image-reader.js";

// Preload the selected original before moving the camera. Rapid input commits only the latest pose.
for (const board of document.querySelectorAll("[data-wardrobe-panel]")) {
  const frames = JSON.parse(board.dataset.frames);
  const controls = board.querySelector("[data-wardrobe-controls]");
  const select = controls.querySelector("select"), counter = controls.querySelector(".wardrobe-count");
  const image = board.querySelector("[data-wardrobe-image]"), original = board.querySelector("[data-wardrobe-original]");
  const announcer = controls.querySelector("output");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = 0, desired = 0, request = 0, effect;

  function stopEffect() { effect?.cancel(); effect = null; }
  reduced.addEventListener("change", stopEffect);
  async function choose(index, animate = true) {
    const ticket = ++request;
    desired = (index + frames.length) % frames.length;
    const frame = frames[desired];
    select.selectedIndex = desired;
    if (active === desired) return;
    try {
      const preload = new Image();
      preload.src = frame.src;
      await preload.decode();
    } catch {
      if (ticket === request) {
        select.selectedIndex = desired = active;
        board.querySelector(".wardrobe-fallback").hidden = false;
      }
      return;
    }
    if (ticket !== request) return;
    active = desired;
    image.style.setProperty("--cx", frame.left + "%");
    image.style.setProperty("--cy", frame.top + "%");
    image.style.setProperty("--cw", frame.size + "%");
    image.width = frame.width; image.height = frame.height;
    image.src = frame.src;
    original.href = frame.original;
    image.alt = frame.alt;
    counter.textContent = (active + 1) + " / " + frames.length;
    if (animate) announcer.textContent = frame.alt;
    stopEffect();
    if (animate && !reduced.matches && image.animate)
      effect = image.animate([{ opacity: .78 }, { opacity: 1 }], { duration: 150 });
  }
  select.addEventListener("change", () => choose(select.selectedIndex));
  controls.querySelectorAll("[data-turn]").forEach(button => {
    button.addEventListener("click", () => choose(desired + Number(button.dataset.turn)));
  });
  const box = board.querySelector(".wardrobe-reader");
  const originals = [...board.querySelectorAll(".wardrobe-fallback a")];
  const reader = imageReader(box, originals, index => {
    box.querySelector("img").alt = frames[index].alt;
    choose(index, false);
  });
  if (reader) original.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    reader.open(active, original);
  });
  board.querySelector(".wardrobe-fallback").hidden = true;
  controls.hidden = false;
}
