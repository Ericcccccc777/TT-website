// These are manual tabs with a native horizontal scroll surface. Without this module
// the index is an ordinary set of fragment links and all articles remain in flow.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

function bindFolio(folio) {
  const index = folio.querySelector(".fg-index");
  const track = folio.querySelector(".fg-track");
  const tabs = [...index.children];
  const leaves = [...track.children];
  let current = 0;
  let settled;
  index.setAttribute("role", "tablist");
  folio.classList.add("fg-bound");
  for (const [i, tab] of tabs.entries()) {
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", leaves[i].id);
    leaves[i].setAttribute("role", "tabpanel");
  }

  function select(next) {
    const restoreFocus = next !== current && leaves[current].contains(document.activeElement);
    leaves[next].inert = false;
    leaves[next].tabIndex = 0;
    if (restoreFocus) leaves[next].focus({ preventScroll: true });
    current = next;
    tabs.forEach((tab, i) => {
      const active = i === next;
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute("aria-selected", String(active));
      leaves[i].inert = !active;
      leaves[i].tabIndex = active ? 0 : -1;
      leaves[i].classList.toggle("fg-selected", active);
    });
  }

  function go(next, smooth = false) {
    select(next);
    track.scrollTo({ left: leaves[next].offsetLeft, behavior: smooth && !reduced.matches ? "smooth" : "auto" });
  }

  function fromHash() {
    if (!location.hash) return -1;
    const target = document.getElementById(location.hash.slice(1));
    return leaves.findIndex((leaf) => leaf.contains(target));
  }

  go(Math.max(0, fromHash()));
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      go(i, true);
    });
    tab.addEventListener("keydown", (e) => {
      const count = tabs.length;
      const next = { ArrowLeft: (i + count - 1) % count, ArrowRight: (i + 1) % count, Home: 0, End: count - 1 }[e.key];
      if (next === undefined && e.key !== " ") return;
      e.preventDefault();
      tabs[next ?? i].focus({ preventScroll: true });
      go(next ?? i, true);
    });
  });
  track.addEventListener("scroll", () => {
    // Commit a swipe after the rail comes to rest, rather than announcing each
    // intermediate slide during momentum or a jump across several tabs.
    clearTimeout(settled);
    settled = setTimeout(() => {
      const nearest = leaves.reduce((chosen, leaf, i) =>
        Math.abs(leaf.offsetLeft - track.scrollLeft) < Math.abs(leaves[chosen].offsetLeft - track.scrollLeft) ? i : chosen, 0);
      if (nearest !== current) select(nearest);
    }, 120);
  }, { passive: true });
  let width = track.clientWidth;
  new ResizeObserver(() => {
    if (width === track.clientWidth) return;
    width = track.clientWidth;
    go(current);
  }).observe(track);
  window.addEventListener("hashchange", () => {
    const next = fromHash();
    if (next >= 0) go(next);
  });
}

for (const folio of document.querySelectorAll("[data-folio]")) bindFolio(folio);

for (const pin of document.querySelectorAll("[data-room-pin]")) {
  const note = document.getElementById(pin.getAttribute("aria-controls"));
  pin.hidden = false;
  pin.addEventListener("click", () => { note.open = !note.open; });
  // Opening one grouped disclosure can also close its neighbour in the same click.
  // Mirror native state before the next paint, including that implicit close.
  const sync = () => pin.setAttribute("aria-expanded", String(note.open));
  new MutationObserver(sync).observe(note, { attributes: true, attributeFilter: ["open"] });
  sync();
}
