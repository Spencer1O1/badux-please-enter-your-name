/* Application shell. Applicant information lives only in memory: no storage or requests. */
(() => {
  "use strict";
  const { departments, rules: R } = NameOffice;
  const stage = document.querySelector("#stage");
  const message = document.querySelector("#message");
  const progress = document.querySelector(".progress");
  const hintButton = document.querySelector("#hint-button");
  const seed = readRunSeed() ?? R.newRunSeed();
  const state = { applicant: "", current: 0, records: {}, seed, queue: R.issueQueueTicket(R.createRandom(seed, "", "Queue")), startedAt: null, finishedAt: null, lost: false, assistanceCount: 0 };
  let queueTimer = null;
  let queueVisible = true;
  let queueRenderKey = "";
  let queueSignal = "";
  let activeDepartment;

  function readRunSeed() {
    const requested = new URLSearchParams(location.hash.slice(1)).get("seed");
    return /^[0-9a-f]{8}$/i.test(requested || "") ? parseInt(requested, 16) : null;
  }

  function recordRunSeed() {
    const code = R.runCode(state.seed);
    document.body.dataset.runSeed = code;
    const url = new URL(location.href);
    url.hash = `seed=${code}`;
    history.replaceState(null, "", url);
  }

  function announce(value, kind = "") {
    message.className = "message" + (kind ? " " + kind : "");
    message.textContent = value;
  }

  function stopQueue() {
    if (queueTimer !== null) clearTimeout(queueTimer);
    queueTimer = null;
  }

  function updateTickerVisibility() {
    document.querySelector("#queue-ticker").hidden = queueVisible || state.startedAt === null || state.lost || state.current === departments.length;
  }

  function renderQueue(snapshot) {
    const complete = state.current === departments.length;
    const phase = state.lost ? "missed" : complete ? "complete" : snapshot.phase;
    updateTickerVisibility();
    const key = `${state.queue.number}:${snapshot.serving}:${phase}`;
    if (key === queueRenderKey) return;
    queueRenderKey = key;
    document.body.dataset.queuePhase = phase;
    document.body.dataset.queueRunning = String(state.startedAt !== null && !state.lost && !complete);
    document.querySelector("#now-serving").textContent = String(snapshot.serving).padStart(3, "0");
    document.querySelector("#queue-number").textContent = String(state.queue.number).padStart(3, "0");
    document.querySelector("#ticker-serving").textContent = String(snapshot.serving).padStart(3, "0");
    document.querySelector("#ticker-number").textContent = String(state.queue.number).padStart(3, "0");
    document.querySelector("#ticker-ahead").textContent = snapshot.ahead === 1 ? "YOU’RE NEXT" : `${snapshot.ahead} AHEAD`;
    const footer = phase === "waiting" ? `${R.queuePlaces} AHEAD · STARTS AT BEGIN`
      : phase === "complete" ? "PAPERWORK READY. TURN SECURED."
        : phase === "missed" ? "YOUR TURN. YOUR PAPERS?"
          : snapshot.ahead === 1 ? "YOUR NUMBER IS NEXT."
            : phase === "critical" ? `${snapshot.ahead} AHEAD. HAVE PAPERS READY.`
              : phase === "urgent" ? `${snapshot.ahead} AHEAD. ALMOST YOUR TURN.`
                : phase === "warning" ? `${snapshot.ahead} AHEAD. KEEP FILING.` : `${snapshot.ahead} TICKETS AHEAD`;
    document.querySelector(".queue-footer").textContent = footer;
    const signal = phase === "critical" && snapshot.ahead === 1 ? "next" : phase;
    if (signal !== queueSignal) {
      queueSignal = signal;
      document.querySelector("#queue-announcement").textContent = ({
        warning: "Two minutes until your turn. Keep filing.", urgent: "One minute. Have your paperwork ready.",
        critical: "Thirty seconds until your number is called.", next: "Your number is next."
      })[signal] || "";
    }
  }

  function updateQueue(now = Date.now()) {
    const snapshot = R.queueStatus(state.queue, state.startedAt, state.finishedAt ?? now);
    if (snapshot.phase === "missed" && !state.lost && state.current < departments.length) {
      missTurn(now);
      return false;
    }
    renderQueue(snapshot);
    stopQueue();
    if (state.startedAt !== null && !state.lost && state.current < departments.length) {
      const elapsed = Math.max(0, now - state.startedAt);
      queueTimer = setTimeout(updateQueue, R.queueStepMs - elapsed % R.queueStepMs);
    }
    return !state.lost;
  }

  function missTurn(now) {
    state.lost = true;
    state.finishedAt = now;
    stopQueue();
    activeDepartment = null;
    renderProgress(false);
    renderReceipt(false);
    renderOffice(false);
    renderQueue(R.queueStatus(state.queue, state.startedAt, now));
    renderOutcome(false);
    const title = stage.querySelector("#stage-title");
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: "start" });
    announce("");
  }

  function renderOffice(complete) {
    const note = state.lost ? {
      text: "I thought ‘next’ was a metaphor. It was not.", author: "Applicant 808, starting again"
    } : complete ? {
      text: "If they say you may leave, leave. I asked whether my approval needed approving. That is how I ended up here.",
      author: "Applicant 514, case reopened"
    } : departments[state.current].note;
    const paper = document.querySelector(".office-note");
    document.querySelector("#office-note-title").textContent = state.lost ? "Filed too slow" : state.current === 0 ? "Before you begin" : complete ? "One final scrap" : "Found in the queue";
    document.querySelector("#office-note-text").textContent = state.current === 0 ? note.text : `“${note.text}”`;
    document.querySelector("#office-note-author").textContent = "— " + note.author;
    document.querySelector("#office-note-estimate").hidden = state.current !== 0;
    const random = R.createRandom(state.seed, state.applicant, `note/${state.current}/${state.lost}`);
    paper.style.setProperty("--note-x", `${(random() * 8 - 4).toFixed(1)}px`);
    paper.style.setProperty("--note-y", `${(random() * 6 - 3).toFixed(1)}px`);
    paper.style.setProperty("--note-angle", `${(random() * 6 - 3).toFixed(1)}deg`);
  }

  function renderProgress(shifted) {
    progress.hidden = false;
    // Always four visible departments. Each unexpected new desk displaces the oldest.
    const end = Math.min(Math.max(4, state.current + 1), departments.length);
    progress.replaceChildren();
    progress.start = end - 3;
    departments.slice(end - 4, end).forEach((department, slot) => {
      const index = end - 4 + slot;
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      item.append(number, document.createTextNode(department.label));
      item.classList.toggle("done", index < state.current);
      if (index === state.current && !state.lost) item.setAttribute("aria-current", "step");
      if (shifted) item.classList.add(slot === 3 ? "new-department" : "shifted-department");
      progress.append(item);
    });
  }

  function approvalFor(department) {
    const approval = department.paperwork.approval;
    return typeof approval === "function" ? approval(state.records) : approval;
  }

  function renderReceipt(complete) {
    document.querySelector("#receipt-name").textContent = state.applicant || "Undetermined";
    document.querySelector("#receipt-count").textContent = `${state.current} filed${state.lost ? " / turn missed" : complete ? " / case closed" : ""}`;
    document.querySelector(".receipt h2").textContent = state.lost ? "Not today." : complete ? "A person. On paper." : state.current ? "A work in paperwork." : "Nothing to report. Yet.";
    const previous = departments[state.current - 1];
    document.querySelector("#receipt-cleared").textContent = previous ? `${previous.label}: ${approvalFor(previous)}` : "Nothing filed yet.";
    document.querySelector("#receipt-hold-label").textContent = complete || state.lost ? "DISPOSITION" : "CURRENT HOLD";
    document.querySelector("#receipt-hold").textContent = state.lost ? "Turn missed. New ticket required." : complete ? "Case closed. You may leave."
      : `${departments[state.current].label}: ${departments[state.current].paperwork.hold}`;
    document.querySelector("#page-count").textContent = state.lost ? "TURN MISSED. APPLICATION VOID." : complete ? "END OF PAPERWORK. ACTUALLY." : `PAGE ${state.current + 1} OF UNNECESSARY PAPERWORK`;
    document.querySelector("#form-number").textContent = state.lost ? "VOID" : complete ? "N-01 ✓" : `N-${String(state.current + 1).padStart(2, "0")}`;
    hintButton.hidden = complete || state.lost;
  }

  function renderOutcome(complete) {
    stage.innerHTML = `<div class="certificate${complete ? "" : " certificate-missed"}">
      <p class="section-number">${complete ? "FORM N-01 / CASE ACTUALLY CLOSED" : "FORM N-01 / APPLICATION VOID"}</p>
      <span class="completion-star" aria-hidden="true">✳</span>
      <h2 class="stage-title" id="stage-title" tabindex="-1">${complete ? "You have a name." : "You missed your turn."}</h2>
      <p class="certificate-line">${complete ? "THIS CERTIFIES THAT" : "THIS OFFICE CONFIRMS THAT"}</p><p class="certificate-name applicant-name"></p>
      <p class="certificate-line">${complete ? "IS, WITH UNREASONABLE CONFIDENCE,<br>A SEQUENCE OF LETTERS." : "WAS CALLED AS TICKET <span id='missed-number'></span><br>WITHOUT THE REQUIRED PAPERWORK."}</p>
      <div class="outcome-stamp ${complete ? "approved-stamp" : "missed-stamp"}">${complete ? "APPROVED<small>YES. REALLY. YOU CAN GO.</small>" : "MISSED<small>NO. REALLY. START AGAIN.</small>"}</div>
      <p class="stage-description">${complete ? "Twelve departments. One name. Zero practical benefit.<br>Your vowels have been returned. Your time has not.<br>This certificate is valid until you stop looking at it." : "Your paperwork wasn’t ready.<br><span id='missed-forms'></span> forms filed. Application void.<br>No extensions. Naturally."}</p>
      <div class="run-result"><span class="micro">${complete ? "COMPLETION TIME" : "TIME WINDOW"}</span><output id="${complete ? "completion-time" : "missed-window"}"></output><small>${complete ? "From Begin to final approval." : "New ticket. All paperwork starts over."}</small><small id="assistance-summary"></small></div>
      <div class="action-row"><button class="primary-button" id="${complete ? "another-button" : "missed-restart"}" type="button">${complete ? "Acquire another name" : "Take a new ticket"} <span class="button-arrow" aria-hidden="true">↺</span></button></div>
      <div class="personal-seal" aria-label="${complete ? "Your personal approval seal" : "Personal seal not issued"}"></div>
    </div>`;
    stage.querySelector(".applicant-name").textContent = state.applicant;
    stage.querySelector("#assistance-summary").textContent = `Assistance used: ${state.assistanceCount} ${state.assistanceCount === 1 ? "time" : "times"}`;
    if (complete) stage.querySelector("#completion-time").textContent = R.formatRunTime(state.finishedAt - state.startedAt);
    else {
      stage.querySelector("#missed-number").textContent = state.queue.number;
      stage.querySelector("#missed-forms").textContent = state.current;
      stage.querySelector("#missed-window").textContent = `${R.queueDurationMs / 60000}:00`;
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 11 7");
    svg.setAttribute("aria-hidden", "true");
    if (complete) {
      state.records.seal.glyphs.forEach((glyph, i) => glyph.forEach((row, y) => row.forEach((ink, x) => {
        if (!ink) return;
        const pixel = document.createElementNS(svg.namespaceURI, "rect");
        pixel.setAttribute("x", x + i * 6); pixel.setAttribute("y", y);
        pixel.setAttribute("width", "1"); pixel.setAttribute("height", "1");
        svg.append(pixel);
      })));
    } else {
      const cross = document.createElementNS(svg.namespaceURI, "path");
      cross.setAttribute("d", "M3 1L8 6M8 1L3 6");
      cross.setAttribute("stroke", "currentColor");
      cross.setAttribute("stroke-width", ".35");
      cross.setAttribute("fill", "none");
      svg.append(cross);
    }
    stage.querySelector(".personal-seal").append(svg);
    stage.querySelector(complete ? "#another-button" : "#missed-restart").addEventListener("click", reset);
    activeDepartment = null;
  }

  function showStage({ focus = true, shifted = false } = {}) {
    const complete = state.current === departments.length;
    renderProgress(shifted);
    renderReceipt(complete);
    renderOffice(complete);
    if (!updateQueue()) return;
    announce("");
    if (complete) renderOutcome(true);
    else {
      const department = departments[state.current];
      // Only authored templates enter HTML. All applicant text uses textContent.
      stage.innerHTML = `<form id="department-form" novalidate>
        <p class="section-number">DEPARTMENT ${String(state.current + 1).padStart(2, "0")} / ${department.department}</p>
        <h2 class="stage-title" id="stage-title" tabindex="-1">${department.title}</h2>
        <p class="stage-description" id="instructions">${department.description}</p>
        ${department.body}
        <div class="action-row">
          <button class="primary-button" type="submit">${department.action}<span class="button-arrow" aria-hidden="true">→</span></button>
          <span class="legal-small${department.footnoteLabel ? " footnote-group" : ""}">
            ${department.footnoteLabel ? `<span class="footnote-label">${department.footnoteLabel}</span>` : ""}
            <span class="footnote-text">${department.footnote}</span>
          </span>
        </div>
      </form>`;
      activeDepartment = department.mount({
        root: stage, applicant: state.applicant, records: state.records, announce,
        random: R.createRandom(state.seed, state.applicant, department.label),
        appearanceRandom: R.createRandom(state.seed, state.applicant, `${department.label}/appearance`)
      });
      stage.querySelector("form").addEventListener("submit", submit);
      stage.querySelectorAll("input").forEach(input => input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        announce("");
      }));
    }
    stage.querySelectorAll(".applicant-name").forEach(node => { node.textContent = state.applicant; });
    if (focus) {
      const title = stage.querySelector("#stage-title");
      title.focus({ preventScroll: true });
      const bounds = title.getBoundingClientRect();
      if (bounds.top < (state.startedAt !== null && !complete ? 68 : 0) || bounds.bottom > window.innerHeight) title.scrollIntoView({ block: "start" });
    }
  }

  function submit(event) {
    event.preventDefault();
    if (!updateQueue() || !activeDepartment) return;
    stage.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"));
    const error = activeDepartment.validate();
    if (error) {
      announce(error, "error");
      const input = stage.querySelector("[aria-invalid=true]") || stage.querySelector("input");
      if (input) { input.setAttribute("aria-invalid", "true"); input.focus({ preventScroll: true }); }
      return;
    }
    const submittedAt = Date.now();
    if (!updateQueue(submittedAt)) return;
    if (state.current === 0) {
      state.applicant = R.normalizeName(stage.querySelector("#name-input").value);
      state.startedAt = submittedAt;
    }
    const approval = approvalFor(departments[state.current]);
    state.current++;
    const complete = state.current === departments.length;
    if (complete) { state.finishedAt = submittedAt; stopQueue(); }
    showStage({ shifted: state.current >= 4 && !complete });
    if (state.lost) return;
    announce(complete ? `${approval} You may leave.`
      : `${approval} ${state.current === 4 ? "Additional department" : "Referred to"}: ${departments[state.current].label}.`);
  }

  function startNewApplication(seed) {
    stopQueue();
    state.startedAt = null;
    state.finishedAt = null;
    state.lost = false;
    state.applicant = "";
    state.current = 0;
    state.records = {};
    state.assistanceCount = 0;
    state.seed = seed;
    state.queue = R.issueQueueTicket(R.createRandom(state.seed, "", "Queue"));
    recordRunSeed();
    showStage();
    announce("Application shredded. Take another number.");
  }

  function reset() {
    startNewApplication(R.newRunSeed(state.seed));
  }

  hintButton.addEventListener("click", () => {
    if (!updateQueue() || !activeDepartment) return;
    const hint = activeDepartment.hint();
    state.assistanceCount++;
    announce(hint, "hint");
  });
  document.querySelector("#reset-button").addEventListener("click", reset);
  new IntersectionObserver(entries => {
    queueVisible = entries[0].intersectionRatio >= .5;
    updateTickerVisibility();
  }, { threshold: .5 }).observe(document.querySelector(".queue"));
  document.addEventListener("visibilitychange", () => updateQueue());
  window.addEventListener("focus", () => updateQueue());
  window.addEventListener("hashchange", () => {
    if (!new URLSearchParams(location.hash.slice(1)).has("seed")) {
      recordRunSeed(); // Keep replay links intact after in-page navigation.
      return;
    }
    const seed = readRunSeed() ?? R.newRunSeed(state.seed);
    if (seed !== state.seed) startNewApplication(seed);
    else recordRunSeed();
  });
  recordRunSeed();
  showStage({ focus: false });
})();
