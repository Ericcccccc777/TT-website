import { imageReader } from "./image-reader.js";

function album(root) {
  const picks = [...root.querySelectorAll("[data-sticker-pick]")];
  const browse = root.querySelector("[data-album-open]");
  const book = root.querySelector("dialog");
  const pet = document.querySelector(".pet");
  const giveButton = book.querySelector("[data-sticker-give]");
  const hint = root.querySelector("[data-hint]");
  let chosen = 0;

  function mark(i) {
    picks[chosen].querySelector("figure").classList.remove("is-picked");
    chosen = i;
    picks[chosen].querySelector("figure").classList.add("is-picked");
  }

  function give(i) {
    mark(i);
    const tile = picks[i].querySelector("figure");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && tile.animate) {
      tile.getAnimations().forEach(animation => animation.cancel());
      tile.animate([{ transform: "rotate(-2deg) scale(.97)" }, { transform: "rotate(1deg) scale(1.015)", offset: .52 },
                    { transform: "none" }], { duration: 280, easing: "ease-out" });
    }
    dispatchEvent(new CustomEvent("pet:say", { detail: { text: picks[i].dataset.title, mark: "heart", sticker: picks[i].dataset.file } }));
  }

  const reader = imageReader(book, picks, mark);
  if (reader) {
    browse.hidden = false;
    browse.addEventListener("click", () => reader.open(chosen, browse));
    giveButton.addEventListener("click", () => {
      book.close();
      give(chosen);
    });
  }
  function availability() {
    const canGive = pet && !pet.hidden;
    giveButton.hidden = !canGive;
    hint.textContent = canGive ? hint.dataset.hint : hint.dataset.solo;
    for (const link of picks) {
      if (canGive || reader) link.setAttribute("role", "button");
      else link.removeAttribute("role");
      link.setAttribute("aria-label", canGive ? root.dataset.sendLabel + " · " + link.dataset.title : link.dataset.title);
    }
  }
  function pick(i, link) {
    if (pet && !pet.hidden) give(i);
    else reader.open(i, link);
  }
  availability();
  if (pet) new MutationObserver(availability).observe(pet, { attributes: true, attributeFilter: ["hidden"] });
  root.querySelector(".sticker-tools").hidden = false;
  picks.forEach((link, i) => {
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (link.getAttribute("role") !== "button") return;
      event.preventDefault();
      pick(i, link);
    });
    link.addEventListener("keydown", event => {
      if (event.key === " " && link.getAttribute("role") === "button") {
        event.preventDefault();
        if (!event.repeat) pick(i, link);
      }
    });
  });
}

document.querySelectorAll("[data-sticker-album]").forEach(album);
