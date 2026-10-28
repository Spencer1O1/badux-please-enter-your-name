/* All applicant information lives only in this page's memory. No storage or requests. */
(() => {
  "use strict";

  const stage = document.querySelector("#stage");
  const message = document.querySelector("#message");
  const steps = [...document.querySelectorAll(".progress li")];
  const receiptName = document.querySelector("#receipt-name");
  const receiptCount = document.querySelector("#receipt-count");
  const receiptComment = document.querySelector("#receipt-comment");
  const pageCount = document.querySelector("#page-count");
  const hintButton = document.querySelector("#hint-button");
  let applicant = "";
  let current = 0;
  let selected = new Set();
  const originalTiles = new Set([0, 4, 8]);

  const templates = [
    `<form id="department-form" novalidate>
      <p class="section-number">SECTION 01 / INITIAL INTAKE</p>
      <h2 class="stage-title" id="stage-title" tabindex="-1">Let's start with the easy part.</h2>
      <p class="stage-description" id="instructions">What would you like to be called? Make something up. We have no authority, and frankly, neither should this form.</p>
      <label class="field-label" for="name-input">Your entirely fictional name</label>
      <input class="name-field" id="name-input" name="fictional-name" type="text" placeholder="e.g. Professor Turnip" maxlength="48" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="instructions field-caption message" required>
      <div class="field-caption" id="field-caption"><span>2–24 characters. Letters, spaces, hyphens, apostrophes.</span><span>NO ID REQUIRED*</span></div>
      <div class="action-row"><button class="primary-button" type="submit">Begin paperwork <span class="button-arrow" aria-hidden="true">→</span></button><span class="legal-small">*We wouldn't know<br>what to do with it.</span></div>
    </form>`,
    `<form id="department-form" novalidate>
      <p class="section-number">SECTION 02 / VOLUME CONTROL</p>
      <h2 class="stage-title" id="stage-title" tabindex="-1">The clerk is a little far away.</h2>
      <p class="stage-description" id="instructions">Please enter the same name in ALL CAPITAL LETTERS. The department refuses to move its chair closer.</p>
      <div class="reference-name"><small>NAME ON FILE</small><span class="applicant-name"></span></div>
      <label class="field-label" for="name-input">Your name, but louder</label>
      <input class="name-field" id="name-input" type="text" placeholder="USE YOUR BUREAUCRATIC VOICE" maxlength="96" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="instructions message" required>
      <div class="action-row"><button class="primary-button" type="submit">Say it louder <span class="button-arrow" aria-hidden="true">→</span></button><span class="legal-small">Capitalization is<br>a leadership skill.</span></div>
    </form>`,
    `<form id="department-form" novalidate>
      <p class="section-number">SECTION 03 / VOWEL CUSTOMS</p>
      <h2 class="stage-title" id="stage-title" tabindex="-1">Some letters cannot cross.</h2>
      <p class="stage-description" id="instructions">Remove every A, E, I, O and U from your original name. Keep everything else, including its original capitalization. Y has diplomatic immunity.</p>
      <div class="reference-name"><small>NAME BEFORE CUSTOMS</small><span class="applicant-name"></span></div>
      <label class="field-label" for="name-input">Your name, duty-free</label>
      <input class="name-field" id="name-input" type="text" placeholder="Vowels go in the tray, please." maxlength="96" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="instructions field-caption message">
      <div class="field-caption" id="field-caption"><span>If no letters remain, enter NONE. Accented letters may pass.</span></div>
      <div class="action-row"><button class="primary-button" type="submit">Clear customs <span class="button-arrow" aria-hidden="true">→</span></button><span class="legal-small">Your vowels will be<br>returned. Probably.</span></div>
    </form>`,
    `<form id="department-form" novalidate>
      <p class="section-number">SECTION 04 / PROOF OF NAME</p>
      <h2 class="stage-title" id="stage-title" tabindex="-1">Identify yourself. Three times.</h2>
      <p class="stage-description" id="instructions">Select the three tiles that match your original name exactly. This proves you can recognize the thing you just typed. Groundbreaking.</p>
      <div class="tile-grid" role="group" aria-label="Name recognition tiles" aria-describedby="instructions tile-count"></div>
      <p class="tiles-caption" id="tile-count" aria-live="polite">0 tiles selected. Three required.</p>
      <div class="action-row"><button class="primary-button" type="submit">Submit the evidence <span class="button-arrow" aria-hidden="true">→</span></button><span class="legal-small">Space selects a tile.<br>Tab moves between them.</span></div>
    </form>`,
    `<div class="certificate">
      <p class="section-number">FORM N-01 / CASE SOMEWHAT CLOSED</p>
      <span class="completion-star" aria-hidden="true">✳</span>
      <h2 class="stage-title" id="stage-title" tabindex="-1">You have a name.</h2>
      <p class="certificate-line">THIS CERTIFIES THAT</p>
      <p class="certificate-name applicant-name"></p>
      <p class="certificate-line">IS, WITH REASONABLE CONFIDENCE,<br>A SEQUENCE OF LETTERS.</p>
      <div class="approved-stamp">APPROVED<small>PROVISIONALLY, OF COURSE</small></div>
      <p class="stage-description">Your vowels have been returned. Your time has not.<br>This certificate is valid until you stop looking at it.</p>
      <div class="action-row"><button class="primary-button" id="another-button" type="button">Acquire another name <span class="button-arrow" aria-hidden="true">↺</span></button></div>
    </div>`
  ];

  function announce(text, kind = "") {
    message.className = "message" + (kind ? " " + kind : "");
    message.textContent = text;
  }

  function customsName() {
    return applicant.replace(/[aeiou]/gi, "").trim() || "NONE";
  }

  function focusTitle() {
    stage.querySelector("#stage-title").focus({ preventScroll: true });
  }

  function showStage(moveFocus = true) {
    stage.innerHTML = templates[current]; // Static templates only; applicant text never enters HTML.
    for (const item of stage.querySelectorAll(".applicant-name")) item.textContent = applicant;
    for (const [index, step] of steps.entries()) {
      step.classList.toggle("done", index < current);
      if (index === current) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    }
    receiptName.textContent = applicant || "Undetermined";
    receiptCount.textContent = `${Math.min(current, 4)} / 4`;
    document.querySelector(".receipt h2").textContent = current === 4 ? "A person. On paper." : "A work in paperwork.";
    if (current === 0) document.querySelector(".receipt h2").textContent = "Nothing to report. Yet.";
    receiptComment.textContent = [
      "A blank form is a form full of possibilities.",
      "Name received. Common sense pending.",
      "Applicant successfully heard from a distance.",
      "Five letters detained for questioning.",
      "Thank you for your unnecessary cooperation."
    ][current];
    pageCount.textContent = current === 4 ? "END OF PAPERWORK. BEGINNING OF FREEDOM." : `PAGE ${current + 1} OF UNNECESSARY`;
    document.querySelector("#form-number").textContent = current === 4 ? "N-01 ✓" : "N-01";
    hintButton.hidden = current === 4;
    announce("");
    const form = stage.querySelector("form");
    if (form) form.addEventListener("submit", submit);
    if (current === 3) createTiles();
    if (current === 4) stage.querySelector("#another-button").addEventListener("click", reset);
    if (moveFocus) focusTitle();
  }

  function createTiles() {
    selected = new Set();
    const names = [applicant, applicant + "?", "Not " + applicant, "Dr. " + applicant, applicant, applicant + " Jr.", "[REDACTED]", applicant + " (maybe)", applicant];
    const grid = stage.querySelector(".tile-grid");
    for (const [index, name] of names.entries()) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "name-tile";
      tile.textContent = name;
      tile.setAttribute("aria-pressed", "false");
      tile.setAttribute("aria-label", `Tile ${index + 1}: ${name}`);
      tile.addEventListener("click", () => {
        if (selected.has(index)) selected.delete(index);
        else selected.add(index);
        tile.setAttribute("aria-pressed", String(selected.has(index)));
        stage.querySelector("#tile-count").textContent = `${selected.size} ${selected.size === 1 ? "tile" : "tiles"} selected. Three required.`;
        announce("");
      });
      grid.append(tile);
    }
  }

  function invalid(text) {
    const input = stage.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      input.addEventListener("input", () => input.removeAttribute("aria-invalid"), { once: true });
    }
    announce(text, "error");
  }

  function submit(event) {
    event.preventDefault();
    const value = stage.querySelector("input")?.value.trim() || "";
    if (current === 0) {
      if ([...value].length < 2 || [...value].length > 24 || !/^[\p{L}\p{M} '’-]+$/u.test(value) || !/\p{L}/u.test(value)) {
        invalid("A tiny regulation: use 2–24 characters, including at least one letter. Letters, spaces, hyphens and apostrophes only. Invented names, please.");
        return;
      }
      applicant = value;
    }
    if (current === 1 && value !== applicant.toUpperCase()) {
      invalid(value === applicant ? "Same name, bigger letters. The clerk has made no effort to approach you." : "The department requires your original name in ALL CAPITAL LETTERS. No promotions, titles or spontaneous rebranding.");
      return;
    }
    if (current === 2 && value !== customsName()) {
      invalid("A vowel has crossed the border, or an innocent letter was left behind. Remove only A, E, I, O, U from the ORIGINAL name. Keep its original capitalization.");
      return;
    }
    if (current === 3 && (selected.size !== 3 || [...selected].some(index => !originalTiles.has(index)))) {
      invalid("The evidence is inconclusive. Select only the three exact copies of your original name. Additional punctuation is considered a suspicious disguise.");
      return;
    }
    current += 1;
    showStage();
    if (current < 4) announce(["", "Intake complete. Your name has been forwarded to someone sitting six feet away.", "Volume approved. No need to keep shouting.", "Customs cleared. The vowels are enjoying a small holiday."][current]);
    else announce("Application approved. Nothing was stored or sent. You may now close this tab with disproportionate pride.");
  }

  function reset() {
    applicant = "";
    current = 0;
    selected.clear();
    showStage();
    announce("Application shredded. No information was saved. A fresh administrative adventure awaits.");
  }

  hintButton.addEventListener("click", () => {
    const hints = [
      "Try Professor Turnip, Lady Soup, or any invented name with 2–24 characters. Press Enter to submit.",
      "The department's suggested outside voice: " + applicant.toUpperCase(),
      "Customs has prepared this entirely unnecessary answer for you: " + customsName(),
      "The exact copies are tiles 1, 5 and 9 (top left, center, bottom right). Tab to each tile, press Space to select, then submit."
    ];
    announce(hints[current], "hint");
  });
  document.querySelector("#reset-button").addEventListener("click", reset);
  showStage(false);
})();
