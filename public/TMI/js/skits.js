// A play advances on the reader's cue. Only the inked changes inside that line
// have a clock, including the App's silent paper-plane or cookie handoff.
const motion = matchMedia("(prefers-reduced-motion: reduce)");

function bind(book) {
  const { lines, roles } = JSON.parse(book.dataset.score);
  const toggle = book.querySelector(".skit-toggle"), sheet = book.querySelector(".skit");
  const show = book.querySelector("template").content.firstElementChild.cloneNode(true);
  const duet = show.querySelector(".skit-duet"), prop = show.querySelector(".skit-prop");
  const back = show.querySelector("[data-back]"), next = show.querySelector("[data-next]");
  const players = new Map([...duet.querySelectorAll("[data-actor]")].map(player => [player.dataset.actor, player]));
  let index = 0, attached = false, revision = 0, flight, timers = [];
  const inView = new IntersectionObserver(([entry]) => show.classList.toggle("in-view", entry.isIntersecting));
  let stageWidth = 0;
  const imageUrl = (who, frame) => `/TMI/img/chars/${who}_${frame}.webp`;

  function picture(who, frame, mirror = false) {
    const player = players.get(who), f = roles[who][frame], img = player.querySelector(".skit-lens img");
    player.toggleAttribute("data-mirror", mirror);
    img.width = f.w; img.height = f.h; img.style.left = f.left + "%";
    img.style.bottom = f.bottom + "%"; img.style.width = f.wide + "%"; img.style.height = f.tall + "%";
    const url = imageUrl(who,frame);
    if (img.getAttribute("src") !== url) img.src = url;
    return img;
  }
  function settle() {
    revision++;
    timers.forEach(clearTimeout); timers = [];
    if (flight) { flight.onfinish = null; flight.cancel(); flight = null; }
    prop.hidden = true; prop.style.transform = "";
  }
  function poseLine(index, animate) {
    const line = lines[index];
    for (const [who, player] of players) {
      player.toggleAttribute("data-speaking", line.who === who);
      const moving = animate && who === line.who && line.cels;
      picture(who, moving ? line.cels[0] : who === line.who ? line.frame : "idle");
    }
    if (!animate || !line.cels) return;
    line.changes.forEach((s, i) => timers.push(setTimeout(() => picture(line.who, line.cels[i+1]), s*1000)));
  }
  function wrist(who, frame, point, facingRight) {
    const mirror = (point[0] > roles[who][frame].axis) !== facingRight;
    const img = picture(who, frame, mirror);
    return { img, x: mirror ? 1-point[0] : point[0], y: point[1] };
  }
  function pass(to, handoff, moving) {
    const right = players.get(handoff.sender) === duet.firstElementChild;
    const give = wrist(handoff.sender, "skit_offer", handoff.offer, right);
    const take = wrist(to, "skit_catch", handoff.catch, !right);
    const url = `/TMI/img/skits/${handoff.prop}.webp`;
    if (prop.getAttribute("src") !== url) prop.src = url;
    const turn = revision;
    const launch = () => {
      if (revision !== turn || show.hidden) return;
      const area = duet.getBoundingClientRect();
      const [a,b] = [give,take].map(hand => {
        const r = hand.img.getBoundingClientRect();
        return { x:r.left-area.left+hand.x*r.width, y:r.top-area.top+hand.y*r.height };
      });
      prop.hidden = false;
      if (!moving) {
        prop.style.transform = `translate(${b.x}px,${b.y}px) translate(-50%,-50%)`;
        return;
      }
      const height = Math.min(43, Math.abs(b.x-a.x)*.2);
      const keys = [0,.16,.32,.5,.68,.84,1].map(t => {
        const x = a.x + (b.x-a.x)*t, y = a.y + (b.y-a.y)*t - 4*height*t*(1-t);
        const angle = handoff.prop === "cookie" ? (right?1:-1)*75*t : (right?1:-1)*15*(2*t-1);
        return { transform:`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}deg)`, offset:t };
      });
      flight = prop.animate(keys, {duration:630, easing:"ease-in-out", fill:"forwards"});
      flight.onfinish = () => { settle(); poseLine(index, true); };
    };
    const pending = [give.img, take.img, prop].filter(img => !img.complete || !img.naturalWidth);
    if (!moving || !pending.length) launch();
    else Promise.all(pending.map(img => img.decode())).then(launch, () => {
      if (revision === turn) { settle(); poseLine(index,false); }
    });
  }
  function select(n, forward = false) {
    settle(); index=n;
    const line = lines[index], who = line.who;
    const player = players.get(who), speaker = player.querySelector(".skit-player-name").textContent;
    const script = show.querySelector(".skit-script"); script.style.setProperty("--cue", player===duet.firstElementChild ? "25%" : "75%");
    script.querySelector("[data-speaker]").textContent = speaker;
    script.querySelector("[data-speech]").textContent = line.line;
    const direction = script.querySelector("[data-direction]");
    direction.textContent = line.direction || ""; direction.hidden = !line.direction;
    if (index === 0 && document.activeElement === back) next.focus({preventScroll:true});
    back.disabled = index === 0;
    next.textContent = index === lines.length-1 ? next.dataset.again + " ↻" : next.dataset.more + " ›";
    show.querySelector(".skit-page").textContent = `${index+1} / ${lines.length}`;
    const animate = !motion.matches && !document.hidden;
    if (line.handoff && (motion.matches || (animate && forward && typeof prop.animate === "function"))) {
      for (const [actor, part] of players) part.toggleAttribute("data-speaking", actor === who);
      pass(who, line.handoff, animate);
    } else poseLine(index, animate);
  }
  function close(focus) {
    settle(); show.hidden=true; sheet.hidden=false; toggle.setAttribute("aria-expanded","false"); toggle.textContent=toggle.dataset.openLabel;
    if (focus) toggle.focus({preventScroll:true});
  }
  toggle.hidden=false;
  toggle.addEventListener("click", () => {
    if (!sheet.hidden) {
      if (!attached) {
        sheet.parentNode.appendChild(show); attached = true; inView.observe(show);
        new ResizeObserver(([entry]) => {
          const width = entry.contentRect.width;
          if (width && stageWidth && Math.abs(width-stageWidth) > 1 && lines[index].handoff && !prop.hidden) {
            if (motion.matches) pass(lines[index].who, lines[index].handoff, false);
            else { settle(); poseLine(index, false); }
          }
          stageWidth = width;
        }).observe(duet);
        // Warm only this play. The printed strip needs one cel per line.
        for (const [who, frames] of Object.entries(roles)) for (const frame of Object.keys(frames)) (new Image()).src=imageUrl(who,frame);
        for (const line of lines) if (line.handoff) (new Image()).src=`/TMI/img/skits/${line.handoff.prop}.webp`;
      }
      show.hidden=false; sheet.hidden=true; toggle.setAttribute("aria-expanded","true"); toggle.textContent=toggle.dataset.closeLabel;
      select(0); next.focus({preventScroll:true});
    } else close(true);
  });
  back.addEventListener("click", () => select(Math.max(0,index-1)));
  next.addEventListener("click", () => select((index+1)%lines.length,true));
  show.addEventListener("keydown", e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key==="Escape") { e.preventDefault();e.stopPropagation();close(true);return; }
    const keys={ArrowLeft:Math.max(0,index-1), ArrowRight:Math.min(lines.length-1,index+1), Home:0, End:lines.length-1};
    if (Object.hasOwn(keys,e.key)) {e.preventDefault();e.stopPropagation();if(index!==keys[e.key]) select(keys[e.key],e.key==="ArrowRight");}
  });
  function finishMotion(){
    if (!attached || show.hidden) return;
    if (motion.matches) select(index);
    else if (document.hidden) { settle(); poseLine(index, false); }
  }
  motion.addEventListener("change",finishMotion);
  document.addEventListener("visibilitychange",finishMotion);
}

for (const book of document.querySelectorAll("[data-skit]")) bind(book);
