// All readers use the same keyboard, touch and focus behavior. Each item is a native image link.
export function imageReader(box, items, onTurn) {
  if (!items.length || typeof box?.showModal !== "function") return null;
  const spread = box.querySelector(".comic-spread");
  const image = spread.querySelector("img");
  const title = box.querySelector("[data-reading-title]");
  const position = box.querySelector("[data-comic-number]");
  const close = box.querySelector("[data-close]");
  let index = 0, opener, touch;

  function turn(n) {
    index = (n + items.length) % items.length;
    const item = items[index];
    image.src = item.dataset.full || item.href;
    image.alt = item.dataset.title;
    title.textContent = image.alt;
    if (position) position.textContent = (index + 1) + " / " + items.length;
    onTurn?.(index);
  }

  close.addEventListener("click", () => box.close());
  box.addEventListener("click", event => { if (event.target === box) box.close(); });
  box.addEventListener("close", () => {
    image.removeAttribute("src");
    opener?.focus({ preventScroll: true });
  });
  for (const button of box.querySelectorAll("[data-comic-step]")) {
    button.addEventListener("click", () => turn(index + Number(button.dataset.comicStep)));
  }
  box.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    turn(index + (event.key === "ArrowLeft" ? -1 : 1));
  });
  spread.addEventListener("touchstart", event => {
    const p = event.touches[0];
    touch = event.touches.length === 1 ? [p.clientX, p.clientY] : null;
  }, { passive: true });
  spread.addEventListener("touchcancel", () => { touch = null; });
  spread.addEventListener("touchend", event => {
    if (touch && event.touches.length === 0) {
      const p = event.changedTouches[0];
      const dx = p.clientX - touch[0], dy = p.clientY - touch[1];
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) turn(index + (dx < 0 ? 1 : -1));
    }
    touch = null;
  }, { passive: true });

  return {
    open(n, from) {
      opener = from;
      turn(n);
      box.showModal();
      close.focus({ preventScroll: true });
    },
  };
}
