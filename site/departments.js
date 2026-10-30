/* Each department owns its controls, validation and hint. The shell owns navigation. */
(() => {
  "use strict";
  const R = NameOffice.rules;
  const reference = `<div class="reference-name"><small>APPLICANT NAME</small><span class="applicant-name"></span></div>`;
  const input = (label, id = "name-input", placeholder = "") => `<label class="field-label" for="${id}">${label}</label>
    <input class="name-field" id="${id}" type="text" placeholder="${placeholder}" maxlength="160" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="instructions message">`;
  const output = (id, label) => `<div class="puzzle-readout"><span class="micro">${label}</span><output id="${id}" aria-live="polite"></output></div>`;
  function button(label, className = "secondary-button") {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    return node;
  }
  const read = (root, id = "name-input") => root.querySelector(`#${id}`).value.trim().normalize("NFC");
  const readName = (root, id = "name-input") => R.normalizeName(read(root, id));
  const text = (root, selector, value) => { root.querySelector(selector).textContent = value; };
  const glyph = char => char === " " ? "␣" : char;
  function nameIndex(root, name) {
    const list = root.querySelector(".name-index");
    R.nameLetters(name).forEach((char, index) => {
      const token = document.createElement("span");
      const number = document.createElement("small");
      number.textContent = index + 1;
      token.dataset.character = char;
      token.append(number, document.createTextNode(glyph(char)));
      list.append(token);
    });
  }

  function clerkAvatar(index) {
    const speaker = document.createElement("span");
    speaker.className = "clerk-speaker";
    speaker.dataset.clerk = index;
    speaker.style.setProperty("--clerk-color", ["#496d91", "#9a7140", "#7b608b", "#477c70", "#657374"][index]);
    speaker.style.setProperty("--clerk-paper", ["#dce7ee", "#eee2cd", "#e8dfed", "#dceae0", "#e0e6e2"][index]);
    speaker.setAttribute("aria-hidden", "true");
    const hair = [
      '<path d="M15 20V15Q15 7 24 9Q34 8 33 19L28 15L23 17L19 15Z"/>',
      '<path d="M15 20Q11 9 22 9Q35 5 34 20L29 13L16 17Z"/>',
      '<circle cx="24" cy="9" r="6"/><path d="M14 20Q12 10 24 11Q36 10 34 21L30 15Q24 19 16 16Z"/>',
      '<path d="M14 21Q11 13 17 12L17 22ZM31 12Q37 13 34 22L31 22Z"/>',
      '<path d="M14 20V15Q12 10 17 10Q18 5 23 9Q28 5 31 10Q37 10 34 17L32 21L29 15L18 15L16 21Z"/>'
    ];
    const glasses = index === 0 || index === 3 ? '<g fill="none" stroke="#34443b" stroke-width="1.3"><rect x="16" y="19" width="7" height="5" rx="1"/><rect x="25" y="19" width="7" height="5" rx="1"/><path d="M23 21H25"/></g>' : index === 4 ? '<g fill="none" stroke="#34443b" stroke-width="1.3"><circle cx="20" cy="21" r="4"/><circle cx="28" cy="21" r="4"/></g>' : '';
    speaker.innerHTML = `<svg class="clerk-avatar" viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" fill="var(--clerk-paper)"/><path d="M8 45V40Q8 31 24 31Q40 31 40 40V45" fill="currentColor"/><path d="M19 32L24 39L29 32" fill="#fffef8"/><circle cx="24" cy="21" r="10" fill="#eed6b5"/><g fill="#34443b">${hair[index]}<circle cx="20" cy="21" r="1"/><circle cx="28" cy="21" r="1"/></g>${glasses}<path d="M21 27H27" stroke="#7c6552" stroke-width="1.2"/></svg><svg class="clerk-waves" viewBox="0 0 12 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 8Q6 12 2 16M6 4Q13 12 6 20"/></svg>`;
    return speaker;
  }

  const departments = [
    {
      id: "Intake", label: "Intake", title: "Let's get started.",
      paperwork: { hold: "Name required.", approval: "Name chosen." },
      description: "Enter your name, first and last. 6–20 letters total.",
      body: input("Your entirely fictional name", "name-input", "e.g. Dr. Doofenshmirtz") + `<p class="deadline-rule">Finish before your number is called.</p>`,
      action: "Begin paperwork", footnoteLabel: "NO ID REQUIRED", footnote: "(We wouldn't know what to do with it)",
      note: { text: "First and last name only. A pretend one is ideal.", author: "Management, 1987" },
      mount: ({ root }) => ({
        validate: () => R.validName(read(root)) ? "" : "Use exactly a first and last name (6–20 letters).",
        hint: () => "Try Dr. Doofenshmirtz or Lady Soup."
      })
    },
    {
      instructionClerk: false,
      id: "Check-In", label: "Check-In", title: "The clerk is a little far away.",
      paperwork: { hold: "Capitalized copy required.", approval: "Capitalized copy accepted." },
      description: "Yell your name so he can hear you.",
      body: reference + `<div class="distant-office" aria-hidden="true"><svg class="office-perspective" viewBox="0 0 600 112" preserveAspectRatio="none" fill="none"><path class="office-back-wall" d="M240 12H360V78H240Z"/><path d="M0 0L240 12M600 0L360 12M0 112L240 78M600 112L360 78M0 78H600M0 103H600M113 94H487M192 85H408M130 112L266 78M470 112L334 78"/></svg><div class="distant-window"><span class="distant-window-number">02</span><span class="distant-clerk"></span><span class="distant-counter"></span></div></div>` + input("Your name, but louder", "name-input", "ALL CAPS"),
      action: "Check in", footnote: "Capitalization is a leadership skill.",
      note: { text: "I raised my voice. They capitalized my existence. I think I am a heading now.", author: "Applicant 206, awaiting lowercase" },
      mount: ({ root, applicant }) => {
        root.querySelector(".distant-clerk").append(clerkAvatar(1));
        return {
          validate: () => readName(root) === applicant.toUpperCase().normalize("NFC") ? "" : "Same name. ALL CAPS.",
          hint: () => "Try: " + applicant.toUpperCase()
        };
      }
    },
    {
      id: "Customs", label: "Customs", title: "Vowels cannot cross.",
      paperwork: { hold: "Vowel clearance required.", approval: "Vowel clearance granted." },
      description: "Remove all the vowels from your name... 'Y' has diplomatic immunity.",
      body: reference + input("Your name, duty-free", "name-input", "Leave the vowels behind.") + `<p class="tiles-caption">If empty, enter NONE.</p>`,
      action: "Clear customs", footnote: "Your vowels will be returned. Probably.",
      note: { text: "They took my vowels. I can still remember my childhood, but I can no longer pronounce it.", author: "Applicant 582, partially released" },
      mount: ({ root, applicant }) => ({
        validate: () => R.acceptsCustoms(applicant, readName(root)) ? "" : "Remove the vowels from your name.",
        hint: () => "Try: " + R.customs(applicant)
      })
    },
    {
      id: "Evidence", label: "Verification", title: "Identify yourself. Three times.",
      paperwork: { hold: "Three exact copies required.", approval: "Identity evidence verified." },
      description: "We need three exact copies of your name.",
      body: reference + `<div class="tile-grid" role="group" aria-label="Name recognition tiles" aria-describedby="instructions tile-count"></div><p class="tiles-caption" id="tile-count" aria-live="polite"></p>`,
      action: "Verify my name", footnote: "Three copies ought to settle this.",
      note: { text: "I recognized myself three times. By the fourth, I was beginning to look suspicious.", author: "Applicant 413, identity under review" },
      mount({ root, applicant, announce, random }) {
        const selected = new Set();
        const tiles = R.makeNameEvidence(applicant, random);
        const update = () => text(root, "#tile-count", `${selected.size} tiles selected. Three required.`);
        tiles.forEach((name, index) => {
          const tile = button(name, "name-tile");
          tile.setAttribute("aria-pressed", "false");
          tile.setAttribute("aria-label", `Tile ${index + 1}: ${name}`);
          tile.addEventListener("click", () => {
            if (selected.has(index)) selected.delete(index);
            else selected.add(index);
            tile.setAttribute("aria-pressed", String(selected.has(index)));
            update();
            announce("");
          });
          root.querySelector(".tile-grid").append(tile);
        });
        update();
        return {
          validate: () => selected.size === 3 && [...selected].every(i => tiles[i] === applicant) ? "" : "Pick three exact matches.",
          hint: () => "Tiles " + tiles.flatMap((name, i) => name === applicant ? [i + 1] : []).join(", ") + "."
        };
      }
    },
    {
      id: "Recovery", label: "Restoration", title: "The office shredder found your name.",
      paperwork: { hold: "Shredded name must be restored.", approval: "Document fragments restored." },
      description: "I can't believe they put your name through the shredder. Don't worry, we'll fix it.",
      body: reference + output("recovered-name", "RECOVERED SO FAR") + `<div class="letter-spill" role="group" aria-label="Scattered letters"></div><div class="tool-row"><button class="text-button" type="button" id="undo-letter">Put last letter back ↶</button><button class="text-button" type="button" id="clear-letters">Drop everything ↺</button></div>`,
      action: "Restore my application", footnote: "Some reassembly required.",
      note: { text: "My application fell into the shredder. Apparently I am responsible for putting myself back together.", author: "Applicant 714, unassembled" },
      mount({ root, applicant, announce, random, appearanceRandom }) {
        const picked = [];
        const chars = R.nameLetters(applicant);
        const target = chars.join("");
        const pieces = R.shuffle(chars, random);
        const buttons = [];
        const value = () => picked.map(i => pieces[i]).join("");
        const update = () => {
          text(root, "#recovered-name", R.formatNameProgress(applicant, value()) || "…");
          buttons.forEach((node, i) => { node.hidden = picked.includes(i); });
          root.querySelector("#undo-letter").disabled = !picked.length;
          root.querySelector("#clear-letters").disabled = !picked.length;
        };
        pieces.forEach((char, index) => {
          const slot = document.createElement("div");
          slot.className = "letter-slot";
          const piece = button(char, "loose-letter");
          piece.setAttribute("aria-label", `${char}, piece ${index + 1}`);
          piece.style.setProperty("--tilt", `${Math.round(appearanceRandom() * 24 - 12)}deg`);
          piece.style.setProperty("--drift", `${Math.round(appearanceRandom() * 16 - 8)}px`);
          piece.addEventListener("click", () => {
            const correct = char === chars[picked.length];
            if (correct) picked.push(index);
            else picked.length = 0;
            update();
            announce(correct ? value() === target ? "Name recovered." : "" : "Collect your name's letters in order.", correct ? "" : "error");
            (buttons.find(node => !node.hidden) || root.querySelector("[type=submit]")).focus({ preventScroll: true });
          });
          buttons.push(piece);
          slot.append(piece);
          root.querySelector(".letter-spill").append(slot);
        });
        root.querySelector("#undo-letter").addEventListener("click", () => { picked.pop(); update(); announce(""); });
        root.querySelector("#clear-letters").addEventListener("click", () => { picked.length = 0; update(); announce(""); });
        update();
        return {
          validate: () => value() === target ? "" : "Keep collecting your name’s letters.",
          hint: () => value() === target ? "Name recovered." : `Next: “${chars[picked.length]}”.`
        };
      }
    },
    {
      id: "Secrecy", label: "Security", title: "Your file is locked.",
      paperwork: { hold: "Confidential file must be decrypted.", approval: "Confidential file unlocked." },
      description: "Decrypt your file to attach it to your paperwork.",
      body: reference + `<div class="file-lock"><span class="micro">CONFIDENTIAL / APPLICANT ACCESS ONLY</span><div class="lock-wheels" role="group" aria-label="Four-digit combination lock"></div><div class="file-assessment"><span class="micro">INTERNAL ASSESSMENT</span><ol class="assessment-lines" aria-live="polite" aria-label="Confidential assessment"></ol></div></div>`,
      action: "Unlock my file", footnote: "Your identity is classified. From you.",
      note: { text: "They secured my file against unauthorized access. Apparently that includes me.", author: "Applicant 608, classified" },
      mount({ root, applicant, records, random, announce }) {
        const puzzle = R.makeNameLock(applicant, random);
        const dials = [0, 0, 0, 0];
        const wheels = [];
        const assessment = [
          "Applicant appears to exist.",
          "Name lacks an official stamp.",
          "Existence remains provisional.",
          "Refer to Certification."
        ];
        const lines = assessment.map(message => {
          const line = document.createElement("li");
          for (const char of R.letters(message)) line.append(document.createElement("span"));
          root.querySelector(".assessment-lines").append(line);
          return line;
        });
        const value = () => R.lockGroups(puzzle, dials).join("");
        function update() {
          const groups = R.lockGroups(puzzle, dials);
          wheels.forEach((wheel, i) => {
            wheel.querySelector(".lock-letters").textContent = groups[i] || "—";
            wheel.querySelector(".lock-digit").textContent = dials[i];
            wheel.dataset.value = dials[i];
          });
          lines.forEach((line, i) => {
            R.lockAssessment(puzzle, assessment[i], i, dials).forEach((part, column) => {
              const span = line.children[column];
              span.dataset.dial = part.dial === null ? "" : part.dial;
              if (span.textContent !== part.text) span.textContent = part.text;
            });
          });
          announce("");
        }
        puzzle.encoded.forEach((group, i) => {
          const wheel = document.createElement("div");
          wheel.className = "lock-wheel";
          const display = document.createElement("output");
          display.className = "lock-letters";
          display.setAttribute("aria-label", `File section ${i + 1}`);
          const up = button("▲", "lock-arrow");
          const down = button("▼", "lock-arrow");
          up.setAttribute("aria-label", `Increase dial ${i + 1}`);
          down.setAttribute("aria-label", `Decrease dial ${i + 1}`);
          up.disabled = down.disabled = !group;
          const digit = document.createElement("output");
          digit.className = "lock-digit";
          digit.setAttribute("aria-label", `Dial ${i + 1}`);
          const turn = delta => { dials[i] = (dials[i] + delta + 10) % 10; update(); };
          up.addEventListener("click", () => turn(1));
          down.addEventListener("click", () => turn(-1));
          wheel.addEventListener("keydown", event => {
            if (group && ["ArrowUp", "ArrowDown"].includes(event.key)) {
              event.preventDefault(); turn(event.key === "ArrowUp" ? 1 : -1);
            }
          });
          wheel.append(display, up, digit, down);
          wheels.push(wheel);
          root.querySelector(".lock-wheels").append(wheel);
        });
        update();
        return {
          validate: () => {
            if (value() !== R.nameLetters(puzzle.target).join("")) {
              dials.fill(0); update();
              return "Decrypt your file.";
            }
            records.lock = { combination: [...dials] };
            return "";
          },
          hint: () => `Combination: ${puzzle.combination.join(" ")}.`
        };
      }
    },
    {
      id: "Stamps", label: "Certification", title: "The clerk has mixed up the stamps.",
      paperwork: { hold: "Stamped form required.", approval: "Stamped form filed." },
      description: "Could you help me stamp your name?",
      body: reference + output("stamped-name", "STAMPED SO FAR") + `<div class="stamp-tray" role="group" aria-label="Name stamps"></div><p class="tiles-caption" id="stamp-next" aria-live="polite"></p>`,
      action: "Certify my form", footnote: "Ink is a renewable inconvenience.",
      note: { text: "I found the right stamp. They moved it. I no longer trust the alphabet.", author: "Applicant 291, still reaching" },
      mount({ root, applicant, announce, random }) {
        const { target, stamps } = R.makeNameStamps(applicant);
        const chars = R.letters(target);
        const ink = [];
        const buttons = [];
        let arrangement = R.makeStampTray(stamps, chars[0], random);
        function update() {
          text(root, "#stamped-name", ink.join("") || "…");
          text(root, "#stamp-next", ink.length < chars.length ? `Next: “${chars[ink.length]}”` : "Name stamped.");
          buttons.forEach((node, i) => {
            const char = arrangement[i];
            node.dataset.character = char;
            node.querySelector(".stamp-letter").textContent = char;
            node.setAttribute("aria-label", `Stamp ${char}`);
            node.disabled = ink.length === chars.length;
            node.classList.remove("hinted-stamp");
          });
        }
        function reshuffle() {
          const next = R.makeStampTray(stamps, chars[ink.length], random, arrangement);
          if (next.every((char, i) => char === arrangement[i])) next.push(next.shift());
          arrangement = next;
        }
        for (let i = 0; i < 12; i++) {
          const node = button("", "letter-stamp");
          const body = document.createElement("span");
          body.className = "stamp-body";
          const letter = document.createElement("span");
          letter.className = "stamp-letter";
          body.append(letter);
          node.append(body);
          node.addEventListener("click", () => {
            const char = node.dataset.character;
            if (char === chars[ink.length]) {
              ink.push(char);
              while (chars[ink.length] === " ") ink.push(" ");
              announce(ink.length === chars.length ? "Name stamped." : "");
            } else {
              ink.length = 0;
              announce("Stamp your name in order.", "error");
            }
            reshuffle();
            update();
            if (ink.length === chars.length) root.querySelector("[type=submit]").focus({ preventScroll: true });
          });
          buttons.push(node);
          root.querySelector(".stamp-tray").append(node);
        }
        update();
        return {
          validate: () => ink.join("") === target ? "" : "Stamp the rest of your name.",
          hint: () => {
            const next = chars[ink.length];
            if (next === undefined) return "Name stamped.";
            buttons.find(node => node.dataset.character === next).classList.add("hinted-stamp");
            return `Use the highlighted “${next}” stamp.`;
          }
        };
      }
    },
    {
      instructionClerk: false,
      id: "Archive", label: "Archives", title: "We’ve misfiled your application.",
      paperwork: { hold: "Misfiled application must be found.", approval: ({ archive }) => `Application file ${archive.number} retrieved.` },
      description: "One of the clerks is mistaken. Given the files below, who is it?",
      body: `<div class="archive-puzzle">` + reference + `<div class="name-index" aria-label="Numbered name letters, spaces omitted"></div><div class="archive-review"><p class="archive-step"><b>1</b> Mark who is wrong</p><div class="archive-clerks" role="group" aria-label="Clerk statements"></div></div><p class="archive-step"><b>2</b> Choose your file</p><output class="archive-context" id="archive-context" aria-live="polite">No file selected</output><div class="archive-files" role="group" aria-label="Archive files"></div></div>`,
      action: "Retrieve my file", footnote: "Filed under somebody else, probably.",
      note: { text: "They filed my application under someone else. Now I need my application to prove I am not them.", author: "Applicant 337, identity misfiled" },
      mount({ root, applicant, records, announce, random }) {
        const puzzle = R.makeNameArchive(applicant, random);
        let selectedFile = null;
        let selectedLiar = null;
        nameIndex(root, applicant);
        function select(nodes, selected) {
          announce("");
          nodes.forEach(node => node.setAttribute("aria-pressed", String(node === selected)));
        }
        const fileButtons = puzzle.files.map(file => {
          const node = button("", "archive-file");
          node.dataset.number = file.number;
          node.dataset.seal = JSON.stringify(file.seal);
          node.setAttribute("aria-pressed", "false");
          node.setAttribute("aria-label", `File ${file.number}, filing code ${file.seal.join(" · ")}`);
          const label = document.createElement("small");
          const fileNumber = document.createElement("b");
          fileNumber.textContent = file.number;
          label.append(document.createTextNode("FILE "), fileNumber);
          const seal = document.createElement("strong");
          file.seal.forEach(char => {
            const letter = document.createElement("span");
            letter.textContent = char;
            seal.append(letter);
          });
          const owner = document.createElement("span");
          owner.className = "archive-owner";
          owner.textContent = "APPLICANT REDACTED";
          const codeLabel = document.createElement("span");
          codeLabel.className = "archive-code-label";
          codeLabel.textContent = "FILING CODE";
          node.append(label, owner, codeLabel, seal);
          node.addEventListener("click", () => {
            selectedFile = file.number;
            select(fileButtons, node);
            text(root, "#archive-context", `File ${file.number} · Code ${file.seal.join(" · ")}`);
          });
          root.querySelector(".archive-files").append(node);
          return node;
        });
        function linkFields(clue) {
          fileButtons.forEach(node => {
            node.querySelector("small").classList.toggle("archive-linked", clue?.slot === null);
            node.querySelectorAll("strong span").forEach((slot, i) => slot.classList.toggle("archive-linked", clue?.slot === i));
          });
          root.querySelectorAll(".name-index > span").forEach((node, i) => node.classList.toggle("archive-linked", clue?.position === i));
        }
        const clerkButtons = puzzle.clues.map((clue, index) => {
          const position = clue.position + 1;
          const suffix = position % 100 >= 11 && position % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[position % 10] || "th");
          const statement = clue.slot === null ? `Your file number is ${clue.parity === 0 ? "even" : "odd"}.`
            : `The code's ${["1st", "2nd", "3rd"][clue.slot]} letter is the ${position}${suffix} letter of your name.`;
          const node = button("", "archive-clerk");
          node.style.setProperty("--clerk-color", ["#496d91", "#9a7140", "#7b608b", "#477c70", "#657374"][index]);
          node.style.setProperty("--clerk-paper", ["#dce7ee", "#eee2cd", "#e8dfed", "#dceae0", "#e0e6e2"][index]);
          if (clue.slot === null) node.dataset.parity = clue.parity;
          node.dataset.slot = clue.slot ?? "number";
          if (clue.position !== undefined) node.dataset.position = clue.position;
          node.setAttribute("aria-pressed", "false");
          const label = document.createElement("strong");
          label.textContent = `Clerk ${"ABCD"[index]}`;
          const claim = document.createElement("q");
          claim.className = "clerk-claim";
          claim.textContent = statement;
          const speech = document.createElement("div");
          speech.className = "clerk-speech";
          speech.append(label, claim);
          const mark = document.createElement("span");
          mark.className = "archive-verdict";
          mark.textContent = "×";
          mark.setAttribute("aria-hidden", "true");
          node.setAttribute("aria-label", `Mark Clerk ${"ABCD"[index]}’s statement false: ${statement}`);
          node.append(clerkAvatar(index), speech, mark);
          node.addEventListener("pointerenter", event => {
            if (event.pointerType !== "touch") linkFields(clue);
          });
          node.addEventListener("pointerdown", () => linkFields(clue));
          node.addEventListener("pointerup", event => {
            if (event.pointerType === "touch" || !node.matches(":hover")) linkFields(null);
          });
          node.addEventListener("pointerleave", () => linkFields(null));
          node.addEventListener("pointercancel", () => linkFields(null));
          node.addEventListener("keydown", event => {
            if (event.key === " " || event.key === "Enter") linkFields(clue);
          });
          node.addEventListener("keyup", event => {
            if (event.key === " " || event.key === "Enter") linkFields(null);
          });
          node.addEventListener("blur", () => {
            if (!node.matches(":hover")) linkFields(null);
          });
          node.addEventListener("click", () => {
            selectedLiar = index;
            select(clerkButtons, node);
          });
          root.querySelector(".archive-clerks").append(node);
          return node;
        });
        return {
          validate: () => {
            const error = "Choose a file that matches three statements and mark the false one.";
            if (selectedFile === null || selectedLiar === null) return error;
            const file = puzzle.files.find(file => file.number === selectedFile);
            const matching = R.archiveTruth(file, puzzle.clues, applicant).filter(Boolean).length;
            if (matching !== 3 || selectedLiar !== puzzle.liar) return error;
            records.archive = { number: file.number, code: file.seal.join(" · ") };
            return "";
          },
          hint: () => `Flag Clerk ${"ABCD"[puzzle.liar]}’s note. Retrieve File ${puzzle.original}.`
        };
      }
    },
    {
      id: "Transit", label: "Routing", title: "Your name has been scattered.",
      paperwork: { hold: "Name routing incomplete.", approval: "Name delivered." },
      description: "Sorry... here's a floorplan to retrieve your name.",
      body: `<div class="reference-name"><small>FIRST NAME</small><span id="maze-target"></span></div>` + output("maze-name", "NAME RECOVERED") + `<p class="stamp-passport" id="maze-next" aria-live="polite"></p><div class="maze-viewport"><div class="desk-maze" tabindex="0" role="group" aria-label="Name maze, fifteen rows of fifteen. Press or drag through green squares, or use arrow keys to the next junction." aria-describedby="maze-next maze-controls"></div></div><p class="tiles-caption" id="maze-controls">Press or drag through green squares. Arrows / WASD.</p><button class="text-button" id="restart-maze" type="button">Start over ↺</button>`,
      action: "Confirm my route", footnote: "The floor plan is legally a filing system.",
      note: { text: "I started in the middle. Every corridor led to more of me. I am beginning to suspect the building has taken this personally.", author: "Applicant 805, still finding herself" },
      mount({ root, applicant, announce, random }) {
        const firstName = R.normalizeName(applicant).split(" ")[0];
        text(root, "#maze-target", firstName);
        const maze = R.makeNameMaze(applicant, random);
        let state = { position: maze.start, collected: 0, found: [] };
        let facing = "up";
        const plane = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        plane.classList.add("maze-plane");
        plane.setAttribute("viewBox", "0 0 24 24");
        plane.setAttribute("aria-hidden", "true");
        plane.innerHTML = '<path d="M2 3L22 12L2 21L6 12Z" fill="#fffef8" stroke="#34443b" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 12L2 21L22 12Z" fill="#d8c4a3"/><path d="M6 12H22M2 21L6 12" fill="none" stroke="#34443b" stroke-width="1.2" stroke-linejoin="round"/>';
        const board = root.querySelector(".desk-maze");
        const submit = root.querySelector("[type=submit]");
        board.style.setProperty("--maze-width", maze.width);
        board.dataset.width = maze.width;
        board.dataset.entrance = maze.start;
        const cells = [];
        const pieces = new Map(maze.pickups.map(piece => [piece.cell, piece]));
        function update() {
          board.dataset.position = state.position;
          board.dataset.facing = facing;
          plane.style.setProperty("--plane-angle", `${{ right: 0, down: 90, left: 180, up: 270 }[facing]}deg`);
          board.dataset.collected = state.collected;
          board.dataset.found = JSON.stringify(state.found);
          submit.disabled = state.collected !== maze.pickups.length;
          text(root, "#maze-name", maze.pickups.slice(0, state.collected).map(piece => piece.char).join("") || "…");
          const next = maze.pickups[state.collected];
          text(root, "#maze-next", next ? `${state.collected} / ${maze.pickups.length} recovered. Next: “${glyph(next.char)}”.` : "Name recovered.");
          cells.forEach((node, i) => {
            node.classList.remove("hinted-cell");
            const piece = pieces.get(i);
            const collected = piece && state.found.includes(i);
            node.classList.toggle("collected-piece", !!collected);
            node.classList.toggle("current-desk", i === state.position);
            node.classList.toggle("reachable", !!R.mazeRay(maze, state.position, i));
            if (i === state.position) node.setAttribute("aria-current", "location");
            else node.removeAttribute("aria-current");
            const label = piece && !collected ? `letter ${piece.char}` : i === maze.start ? "center mailroom" : "corridor";
            node.setAttribute("aria-label", `Row ${Math.floor(i / maze.width) + 1}, column ${i % maze.width + 1}: ${label}${i === state.position ? ", you are here" : ""}`);
          });
          cells[state.position].append(plane);
        }
        function move(next, focusBoard = true) {
          const previous = state.position;
          state = R.mazeMove(maze, state, next);
          if (state.kind === "wrong") facing = "up";
          else if (state.position !== previous) {
            const delta = state.position - previous;
            facing = Math.abs(delta) >= maze.width ? delta < 0 ? "up" : "down" : delta < 0 ? "left" : "right";
          }
          if (state.kind === "wrong") announce("Collect your first name in order.", "error");
          else if (state.kind === "blocked") announce("Choose a clear row or column.", "error");
          else if (state.kind === "complete") announce("Name recovered.");
          else announce("");
          update();
          if (state.kind === "complete") submit.focus({ preventScroll: true });
          else if (focusBoard) board.focus({ preventScroll: true });
        }
        for (let i = 0; i < maze.width * maze.width; i++) {
          const node = button("", "maze-cell");
          node.dataset.cell = i;
          node.dataset.passages = JSON.stringify(maze.passages[i]);
          node.tabIndex = -1;
          // Draw each internal wall once, keeping it a single pixel thick.
          if (!maze.passages[i].includes(i - maze.width)) node.classList.add("wall-top");
          if (!maze.passages[i].includes(i - 1) || i % maze.width === 0) node.classList.add("wall-left");
          const piece = pieces.get(i);
          if (piece) {
            node.classList.add("maze-piece");
            node.dataset.pieceIndex = piece.index;
            node.dataset.character = piece.char;
            const char = document.createElement("span");
            char.textContent = glyph(piece.char);
            node.append(char);
          } else if (i === maze.start) node.textContent = "⌂";
          node.addEventListener("click", event => {
            if (event.detail === 0 && i !== state.position) move(i);
          });
          cells.push(node);
          board.append(node);
        }
        const offsets = { ArrowUp: -maze.width, ArrowDown: maze.width, ArrowLeft: -1, ArrowRight: 1, w: -maze.width, s: maze.width, a: -1, d: 1 };
        board.addEventListener("keydown", event => {
          const offset = offsets[event.key] ?? offsets[event.key.toLowerCase()];
          if (offset !== undefined && !event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            move(R.mazeRun(maze, state, offset));
          }
        });
        let drag = null;
        function finishDrag() {
          if (!drag) return;
          const { pointerId } = drag;
          drag = null;
          board.classList.remove("dragging-plane");
          if (board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
        }
        function pointerPoint(event) {
          const bounds = board.getBoundingClientRect();
          return {
            x: (event.clientX - bounds.left - board.clientLeft) / board.clientWidth * maze.width,
            y: (event.clientY - bounds.top - board.clientTop) / board.clientHeight * maze.width
          };
        }
        function visitCell(cell) {
          if (cell === state.position || !R.mazeRay(maze, state.position, cell)) return;
          move(cell, false);
          if (state.kind === "wrong" || state.kind === "complete") finishDrag();
        }
        function dragThrough(event) {
          if (!drag || event.pointerId !== drag.pointerId) return;
          const to = pointerPoint(event);
          if (to.x < 0 || to.y < 0 || to.x >= maze.width || to.y >= maze.width) {
            finishDrag();
            return;
          }
          const from = drag.last;
          drag.last = to;
          let column = Math.floor(from.x), row = Math.floor(from.y);
          const endColumn = Math.floor(to.x), endRow = Math.floor(to.y);
          if (column === endColumn && row === endRow) return;
          const dx = to.x - from.x, dy = to.y - from.y;
          const stepX = Math.sign(dx), stepY = Math.sign(dy);
          let crossX = dx ? (column + (stepX > 0 ? 1 : 0) - from.x) / dx : Infinity;
          let crossY = dy ? (row + (stepY > 0 ? 1 : 0) - from.y) / dy : Infinity;
          // Visit every crossed cell, even when a fast pointer event spans a corridor.
          while (column !== endColumn || row !== endRow) {
            if (crossX < crossY) { column += stepX; crossX += 1 / Math.abs(dx); }
            else { row += stepY; crossY += 1 / Math.abs(dy); }
            visitCell(row * maze.width + column);
            if (!drag) return;
          }
        }
        board.addEventListener("pointerdown", event => {
          if (event.button !== 0 || event.isPrimary === false) return;
          event.preventDefault();
          board.focus({ preventScroll: true });
          const point = pointerPoint(event);
          drag = { pointerId: event.pointerId, last: point };
          board.setPointerCapture(event.pointerId);
          board.classList.add("dragging-plane");
          visitCell(Math.floor(point.y) * maze.width + Math.floor(point.x));
        });
        board.addEventListener("pointermove", dragThrough);
        board.addEventListener("pointerup", event => {
          if (!drag || event.pointerId !== drag.pointerId) return;
          dragThrough(event);
          finishDrag();
        });
        board.addEventListener("pointercancel", () => finishDrag());
        board.addEventListener("lostpointercapture", () => finishDrag());
        root.querySelector("#restart-maze").addEventListener("click", () => {
          finishDrag();
          state = { position: maze.start, collected: 0, found: [] };
          facing = "up";
          update();
          announce("Maze reset.");
        });
        update();
        return {
          validate: () => state.collected === maze.pickups.length ? "" : "Collect every piece in order.",
          hint: () => {
            const next = maze.pickups[state.collected];
            if (!next) return "Name recovered.";
            const path = maze.pickups.filter(piece => !state.found.includes(piece.cell) && piece.char.toUpperCase() === next.char.toUpperCase())
              .map(piece => R.mazePath(maze, state.position, piece.cell)).sort((a, b) => a.length - b.length)[0];
            let target = path[0];
            const offset = target - state.position;
            for (const cell of path.slice(1)) {
              if (cell - target !== offset) break;
              target = cell;
            }
            cells.forEach(node => node.classList.remove("hinted-cell"));
            cells[target].classList.add("hinted-cell");
            return `Move to the highlighted square toward “${next.char}”.`;
          }
        };
      }
    },
    {
      id: "Energy", label: "Electrical", title: "Your nameplate needs power.",
      paperwork: { hold: "Nameplate power clearance required.", approval: "Nameplate power cleared." },
      description: "Light your entire nameplate using exactly three circuits.",
      body: reference + `<div class="power-panel"><div class="power-panel-header"><span class="micro">NAMEPLATE / POWER SUPPLY</span><div class="power-budget" aria-hidden="true"><i></i><i></i><i></i></div></div><svg class="power-wires" aria-hidden="true" focusable="false"></svg><div class="switchboard switchboard-top" role="group" aria-label="Circuits 1 to 3"></div><div class="name-power" role="group" aria-label="First and last name on separate rows"></div><div class="switchboard switchboard-bottom" role="group" aria-label="Circuits 4 to 6"></div></div>`,
      action: "Request power clearance", footnote: "Existence requires a working connection.",
      note: { text: "They said my name wasn’t grounded. I told them I’d been here all morning.", author: "Applicant 462, awaiting connection" },
      mount({ root, applicant, records, announce, random }) {
        const puzzle = R.makeNamePower(applicant, random);
        const allowance = 3;
        const panel = root.querySelector(".power-panel");
        const wires = root.querySelector(".power-wires");
        const switches = [];
        const colors = ["#72c8c1", "#edb75c", "#8cbcf0", "#d89ab8", "#b9a1ed", "#b2ca6a"];
        let linked = null;
        const on = new Set();
        const lamps = [];
        puzzle.rows.forEach((chunks, rowIndex) => {
          const row = document.createElement("div");
          row.className = "name-power-row";
          row.setAttribute("role", "group");
          row.setAttribute("aria-label", rowIndex === 0 ? "First name" : "Last name");
          row.style.setProperty("--sections", chunks.length);
          chunks.forEach(chunk => {
            const lamp = document.createElement("div");
            lamp.className = "name-section";
            const number = document.createElement("small");
            number.textContent = `SECTION ${lamps.length + 1}`;
            const content = document.createElement("strong");
            content.textContent = chunk;
            const status = document.createElement("span");
            lamp.append(number, content, status);
            lamps.push(lamp);
            row.append(lamp);
          });
          root.querySelector(".name-power").append(row);
        });
        function update() {
          const mask = R.powerState(puzzle, on);
          switches.forEach((node, i) => { node.disabled = on.size === allowance && !on.has(i + 1); });
          panel.querySelectorAll(".power-budget i").forEach((light, i) => light.classList.toggle("used", i < on.size));
          wires.querySelectorAll("[data-circuit]").forEach(group => group.classList.toggle("powered", on.has(Number(group.dataset.circuit))));
          lamps.forEach((lamp, i) => {
            const lit = !!(mask & (1 << i));
            lamp.classList.toggle("lit", lit);
            lamp.querySelector("span").textContent = lit ? "LIT" : "DARK";
          });
        }
        puzzle.masks.forEach((mask, i) => {
          const node = button("", "circuit-switch");
          node.dataset.mask = mask;
          node.style.setProperty("--wire-color", colors[i]);
          node.setAttribute("aria-label", `Circuit ${i + 1}`);
          node.setAttribute("aria-pressed", "false");
          const label = document.createElement("strong");
          label.textContent = `Circuit ${i + 1}`;
          const wiring = document.createElement("span");
          wiring.textContent = R.circuitNumbers(mask, lamps.length).join(" · ");
          node.setAttribute("aria-description", `Toggles sections ${R.circuitNumbers(mask, lamps.length).join(", ")}`);
          const symbol = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          symbol.setAttribute("viewBox", "0 0 12 14");
          symbol.setAttribute("aria-hidden", "true");
          symbol.classList.add("power-symbol");
          const circle = document.createElementNS(symbol.namespaceURI, "circle");
          circle.classList.add("power-symbol-off");
          circle.setAttribute("cx", "6"); circle.setAttribute("cy", "7"); circle.setAttribute("r", "3.5");
          const line = document.createElementNS(symbol.namespaceURI, "path");
          line.classList.add("power-symbol-on"); line.setAttribute("d", "M6 3V11");
          symbol.append(circle, line);
          node.append(symbol, label, wiring);
          const trace = value => {
            linked = value;
            wires.querySelectorAll("[data-circuit]").forEach(group => group.classList.toggle("traced", Number(group.dataset.circuit) === linked));
            lamps.forEach((lamp, section) => lamp.classList.toggle("power-linked", linked !== null && !!(puzzle.masks[linked - 1] & (1 << section))));
          };
          node.addEventListener("mouseenter", () => trace(i + 1));
          node.addEventListener("focus", () => trace(i + 1));
          node.addEventListener("mouseleave", () => trace(null));
          node.addEventListener("blur", () => trace(null));
          node.addEventListener("click", () => {
            if (on.has(i + 1)) on.delete(i + 1);
            else if (on.size < allowance) on.add(i + 1);
            else return;
            node.setAttribute("aria-pressed", String(on.has(i + 1)));
            update();
            announce(on.size === allowance && R.powerState(puzzle, on) === puzzle.target ? "Nameplate compliant. Request your permit." : "");
          });
          switches.push(node);
          root.querySelector(i < 3 ? ".switchboard-top" : ".switchboard-bottom").append(node);
        });
        function drawWires() {
          const bounds = panel.getBoundingClientRect();
          const rows = [...root.querySelectorAll(".name-power-row")];
          const firstRow = rows[0].getBoundingClientRect();
          wires.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
          wires.replaceChildren();
          switches.forEach((node, i) => {
            const upperBank = i < 3;
            const slot = i % 3;
            const start = node.getBoundingClientRect();
            const group = document.createElementNS(wires.namespaceURI, "g");
            group.dataset.circuit = i + 1;
            group.style.setProperty("--wire-color", colors[i]);
            group.classList.toggle("powered", on.has(i + 1));
            group.classList.toggle("traced", linked === i + 1);
            const sx = start.left + start.width / 2 - bounds.left;
            const sy = (upperBank ? start.bottom : start.top) - bounds.top;
            // Each bank has three bus lanes. Every circuit gets its own pin
            // position on each section and its own perimeter lane across rows.
            const lane = sy + (upperBank ? 1 : -1) * (16 + slot * 10);
            const side = slot === 1 ? bounds.width - (4 + i * 2) : 4 + i * 2;
            const middleLane = firstRow.bottom - bounds.top + 6 + i * 4;
            lamps.forEach((lamp, section) => {
              if (!(puzzle.masks[i] & (1 << section))) return;
              const end = lamp.getBoundingClientRect();
              const ex = end.left - bounds.left + 5 + (end.width - 10) * (i + 1) / 7;
              const ey = (upperBank ? end.top - 2 : end.bottom + 2) - bounds.top;
              const first = lamp.parentElement === rows[0];
              const sameSide = upperBank ? first : !first;
              const path = document.createElementNS(wires.namespaceURI, "path");
              path.setAttribute("d", sameSide ? `M${sx} ${sy} V${lane} H${ex} V${ey}`
                : `M${sx} ${sy} V${lane} H${side} V${middleLane} H${ex} V${ey}`);
              const pin = document.createElementNS(wires.namespaceURI, "circle");
              pin.setAttribute("cx", ex); pin.setAttribute("cy", ey); pin.setAttribute("r", "2");
              pin.setAttribute("fill", "#20382d");
              group.append(path, pin);
            });
            wires.append(group);
          });
        }
        const observer = new ResizeObserver(drawWires);
        observer.observe(panel);
        drawWires();
        update();
        return {
          dispose: () => observer.disconnect(),
          validate: () => {
            if (on.size !== allowance || R.powerState(puzzle, on) !== puzzle.target) return "Light every section with exactly three circuits.";
            records.power = [...on].sort((a, b) => a - b);
            return "";
          },
          hint: () => {
            const solution = R.powerSolution(puzzle);
            const off = [...on].filter(i => !solution.includes(i));
            const add = solution.filter(i => !on.has(i));
            const steps = [off.length ? `Switch off ${off.join(", ")}` : "", add.length ? `switch on ${add.join(", ")}` : ""].filter(Boolean);
            return steps.length ? steps.join("; ") + "." : "Nameplate compliant. Request your permit.";
          }
        };
      }
    },
    {
      id: "Carbon", label: "Reprographics", title: "The copier has cut up your name.",
      paperwork: { hold: "Damaged copy must be restored.", approval: "Copy certified." },
      description: "Repair the copier’s output in four moves.",
      body: reference + `<div class="copy-machine"><div class="copy-machine-header"><span class="micro">DOCUMENT COPIER</span><p id="copy-moves" aria-live="polite"></p></div><div class="copy-comparison"><div class="copy-original"><span class="micro">ORIGINAL</span><div class="copy-strips" id="copy-target"></div></div><div class="copy-output"><span class="micro">OUTPUT TRAY</span><div class="copy-strips" id="copy-value" aria-live="polite"></div></div></div><div class="copy-controls" role="group" aria-label="Copier controls"></div><div class="tool-row"><button class="text-button" id="copy-undo" type="button">Undo operation ↶</button><button class="text-button" id="copy-reset" type="button">Revert ↺</button></div></div>`,
      action: "Confirm my copy", footnote: "Original identity. Recycled paper.",
      note: { text: "The copy looked more like me than the original. They asked which one was applying.", author: "Applicant 193, duplicate pending" },
      mount({ root, applicant, announce, random }) {
        const { start, target, strips } = R.makeCopyPuzzle(applicant, random);
        const history = [start];
        const value = () => history[history.length - 1];
        const stripColors = ["#57778b", "#947140", "#77648a", "#538171", "#a16550"];
        function renderStrips(selector, order) {
          const holder = root.querySelector(selector);
          const previous = new Map([...holder.children].map(node => [node.dataset.strip, node.getBoundingClientRect()]));
          const existing = new Map([...holder.children].map(node => [node.dataset.strip, node]));
          holder.dataset.order = order;
          const nodes = [...order].map(id => {
            if (existing.has(id)) return existing.get(id);
            const node = document.createElement("span");
            node.dataset.strip = id;
            node.style.setProperty("--strip", id);
            node.style.setProperty("--strip-color", stripColors[Number(id)]);
            const number = document.createElement("small");
            number.textContent = Number(id) + 1;
            const chunk = document.createElement("b");
            chunk.textContent = strips[Number(id)];
            node.append(number, chunk);
            return node;
          });
          holder.replaceChildren(...nodes);
          if (!matchMedia("(prefers-reduced-motion: reduce)").matches) nodes.forEach(node => {
            const before = previous.get(node.dataset.strip);
            if (!before) return;
            const after = node.getBoundingClientRect();
            if (before.left !== after.left) node.animate([{ transform: `translateX(${before.left - after.left}px)` }, { transform: "translateX(0)" }], { duration: 220, easing: "ease-out" });
          });
        }
        renderStrips("#copy-target", target);
        const controls = [];
        function update() {
          announce(value() === target ? "Name reassembled." : "");
          renderStrips("#copy-value", value());
          text(root, "#copy-moves", `${history.length - 1} / 4 moves.`);
          controls.forEach(node => { node.disabled = history.length > 4; });
          root.querySelector("#copy-undo").disabled = history.length === 1;
        }
        R.copyOperations.forEach(operation => {
          const node = button("");
          node.className = "copy-operation";
          const icon = document.createElement("span");
          icon.className = "copy-operation-icon";
          icon.textContent = ["⇄", "↶", "⇆"][R.copyOperations.indexOf(operation)];
          icon.setAttribute("aria-hidden", "true");
          const label = document.createElement("b");
          label.textContent = operation.label;
          const diagram = document.createElement("span");
          diagram.className = "copy-operation-diagram";
          diagram.setAttribute("aria-hidden", "true");
          for (const id of operation.apply("12345")) {
            const tile = document.createElement("i");
            tile.textContent = id;
            tile.style.setProperty("--strip-color", stripColors[Number(id) - 1]);
            diagram.append(tile);
          }
          node.append(icon, label, diagram);
          node.setAttribute("aria-label", operation.label);
          node.title = operation.description;
          node.addEventListener("click", () => { history.push(operation.apply(value())); update(); });
          controls.push(node);
          root.querySelector(".copy-controls").append(node);
        });
        root.querySelector("#copy-undo").addEventListener("click", () => { if (history.length > 1) history.pop(); update(); });
        root.querySelector("#copy-reset").addEventListener("click", () => { history.length = 1; update(); });
        update();
        return {
          validate: () => value() === target ? "" : "Copy mismatch. Undo or reload, then try again.",
          hint: () => {
            const path = R.copySolution(value(), target);
            return path.length <= 5 - history.length ? "From here: " + (path.length ? path.map(i => R.copyOperations[i].label).join(" → ") : "submit.") : "Reload, then: " + R.copySolution(start, target).map(i => R.copyOperations[i].label).join(" → ");
          }
        };
      }
    },
    {
      focusTarget: ".seal-cell:not(:disabled)",
      id: "Approval", label: "Approvals", title: "Approve your own approval.",
      paperwork: { hold: "Personal seal required.", approval: "Approval seal stamped." },
      description: "Sign your initials here.",
      body: reference + `<p class="seal-example"><small>Hint: Numbers tell you how the squares are grouped.</p></small><div class="seal-tools" role="group" aria-label="Seal tools"><button type="button" class="secondary-button" id="seal-ink" aria-pressed="true">Ink</button><button type="button" class="secondary-button" id="seal-blank" aria-pressed="false">Mark blank ×</button><button type="button" class="text-button" id="seal-undo">Undo ↶</button><button type="button" class="text-button" id="seal-reset">Start over ↺</button></div><div class="seal-pair"></div><p class="tiles-caption">Tap or drag to ink. Right-click marks blanks.</p>`,
      action: "Stamp my approval", footnote: "The final authority was you all along.",
      note: { text: "After eleven departments, they asked who had authorized me. I pointed at myself. They handed me a stamp.", author: "Applicant 729, promoted without consent" },
      mount({ root, applicant, records, announce, random }) {
        const initials = R.sealInitials(applicant);
        function glyphFor(initial) {
          const standard = R.sealGlyph(initial);
          if (standard) return standard;
          const canvas = document.createElement("canvas");
          canvas.width = 50; canvas.height = 70;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.font = "bold 64px sans-serif";
          ctx.fillText(initial, 0, 62, 50);
          const pixels = ctx.getImageData(0, 0, 50, 70).data;
          const glyph = Array.from({ length: 7 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
            let alpha = 0;
            for (let y = row * 10; y < row * 10 + 10; y++) for (let x = col * 10; x < col * 10 + 10; x++) alpha += pixels[(y * 50 + x) * 4 + 3];
            return Number(alpha > 25500 * .22);
          }));
          if (!glyph.flat().some(Boolean)) glyph[3][2] = 1;
          return glyph;
        }
        const puzzles = initials.map(initial => R.makeSealPuzzle(glyphFor(initial), Math.floor(random() * 4294967296)));
        let cells = puzzles.map(puzzle => [...puzzle.givens]);
        const history = [];
        const boards = [];
        const tileSets = [];
        const rowClues = [];
        const columnClues = [];
        let mode = 1;
        let stroke = null;
        const snapshot = () => { history.push(cells.map(values => [...values])); if (history.length > 100) history.shift(); };
        const ready = () => puzzles.every((puzzle, i) => R.sealComplete(puzzle, cells[i]));
        function update() {
          puzzles.forEach((puzzle, i) => {
            boards[i].removeAttribute("aria-invalid");
            tileSets[i].forEach((tile, cell) => {
              tile.classList.toggle("inked", cells[i][cell] === 1);
              tile.classList.toggle("marked-blank", cells[i][cell] === 0);
              tile.classList.remove("hinted");
              tile.dataset.state = cells[i][cell] === 1 ? "ink" : cells[i][cell] === 0 ? "blank" : "empty";
              tile.setAttribute("aria-pressed", String(cells[i][cell] === 1));
              tile.setAttribute("aria-label", `Row ${Math.floor(cell / puzzle.width) + 1}, column ${cell % puzzle.width + 1}: ${tile.dataset.state}${puzzle.givens[cell] !== null ? ", fixed" : ""}`);
            });
            rowClues[i].forEach((node, row) => node.classList.toggle("satisfied", R.inkRuns(cells[i].slice(row * puzzle.width, (row + 1) * puzzle.width).map(value => Number(value === 1))).join(",") === puzzle.rows[row].join(",")));
            columnClues[i].forEach((node, col) => node.classList.toggle("satisfied", R.inkRuns(Array.from({ length: puzzle.height }, (_, row) => Number(cells[i][row * puzzle.width + col] === 1))).join(",") === puzzle.columns[col].join(",")));
          });
          root.querySelector("#seal-undo").disabled = !history.length;
          announce(ready() ? "Seal ready." : "");
        }
        function paint(i, cell, value) {
          if (puzzles[i].givens[cell] !== null) return;
          cells[i][cell] = value;
          update();
        }
        puzzles.forEach((puzzle, i) => {
          const card = document.createElement("section");
          card.className = "seal-card";
          const heading = document.createElement("p");
          heading.className = "micro";
          heading.textContent = `${i === 0 ? "FIRST" : "LAST"} INITIAL / ${initials[i]}`;
          const board = document.createElement("div");
          board.className = "seal-board";
          board.tabIndex = 0;
          board.setAttribute("role", "group");
          board.setAttribute("aria-label", `${i === 0 ? "First" : "Last"} initial ink grid. Numbers show consecutive filled squares.`);
          board.dataset.rows = JSON.stringify(puzzle.rows);
          board.dataset.columns = JSON.stringify(puzzle.columns);
          board.dataset.givens = JSON.stringify(puzzle.givens);
          board.dataset.width = puzzle.width;
          board.dataset.height = puzzle.height;
          board.style.setProperty("--seal-cols", puzzle.width);
          const corner = document.createElement("span");
          corner.className = "seal-corner";
          board.append(corner);
          const cols = puzzle.columns.map(runs => {
            const node = document.createElement("span"); node.className = "seal-column-clue";
            runs.forEach(run => { const count = document.createElement("span"); count.textContent = run; node.append(count); });
            board.append(node); return node;
          });
          const rows = [];
          const tiles = [];
          puzzle.rows.forEach((runs, row) => {
            const clue = document.createElement("span"); clue.className = "seal-row-clue";
            clue.textContent = runs.join(" "); rows.push(clue); board.append(clue);
            for (let col = 0; col < puzzle.width; col++) {
              const cell = row * puzzle.width + col;
              const tile = button("", "seal-cell"); tile.dataset.cell = cell;
              tile.disabled = puzzle.givens[cell] !== null;
              tile.classList.toggle("fixed", tile.disabled);
              tile.addEventListener("click", event => {
                if (event.detail !== 0) return; // Keyboard activation; pointer painting happens below.
                snapshot(); paint(i, cell, cells[i][cell] === mode ? null : mode);
              });
              tile.addEventListener("contextmenu", event => {
                event.preventDefault(); if (tile.disabled) return;
                snapshot(); paint(i, cell, cells[i][cell] === 0 ? null : 0);
              });
              tiles.push(tile); board.append(tile);
            }
          });
          board.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            const tile = event.target.closest(".seal-cell");
            if (!tile || tile.disabled) return;
            event.preventDefault();
            const cell = Number(tile.dataset.cell);
            snapshot(); stroke = { i, value: cells[i][cell] === mode ? null : mode };
            paint(i, cell, stroke.value); board.setPointerCapture(event.pointerId);
          });
          board.addEventListener("pointermove", event => {
            if (!stroke || stroke.i !== i) return;
            const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest(".seal-cell");
            if (tile && board.contains(tile)) paint(i, Number(tile.dataset.cell), stroke.value);
          });
          const stop = () => { stroke = null; };
          board.addEventListener("pointerup", stop); board.addEventListener("pointercancel", stop);
          board.addEventListener("keydown", event => {
            const offsets = { ArrowUp: -puzzle.width, ArrowDown: puzzle.width, ArrowLeft: -1, ArrowRight: 1 };
            if (!(event.key in offsets)) return;
            event.preventDefault();
            let cell = Number(event.target.dataset.cell || 0) + offsets[event.key];
            while (cell >= 0 && cell < tiles.length && tiles[cell].disabled) cell += offsets[event.key];
            if (cell >= 0 && cell < tiles.length) tiles[cell].focus();
          });
          boards.push(board); tileSets.push(tiles); rowClues.push(rows); columnClues.push(cols);
          card.append(heading, board); root.querySelector(".seal-pair").append(card);
        });
        function setMode(next) {
          mode = next;
          root.querySelector("#seal-ink").setAttribute("aria-pressed", String(mode === 1));
          root.querySelector("#seal-blank").setAttribute("aria-pressed", String(mode === 0));
          announce("");
        }
        root.querySelector("#seal-ink").addEventListener("click", () => setMode(1));
        root.querySelector("#seal-blank").addEventListener("click", () => setMode(0));
        root.querySelector("#seal-undo").addEventListener("click", () => { if (history.length) { cells = history.pop(); update(); } });
        root.querySelector("#seal-reset").addEventListener("click", () => { snapshot(); cells = puzzles.map(puzzle => [...puzzle.givens]); update(); });
        update();
        return {
          validate: () => {
            if (!ready()) return "Fill the ink pattern to match every row and column count.";
            records.seal = { initials, glyphs: puzzles.map((puzzle, i) => Array.from({ length: puzzle.height }, (_, row) => cells[i].slice(row * puzzle.width, (row + 1) * puzzle.width).map(value => Number(value === 1)))) };
            return "";
          },
          hint: () => {
            for (let i = 0; i < puzzles.length; i++) {
              const cell = puzzles[i].target.findIndex((ink, cell) => ink !== Number(cells[i][cell] === 1));
              if (cell >= 0) {
                tileSets[i].forEach(tile => tile.classList.remove("hinted")); tileSets[i][cell].classList.add("hinted");
                return `${i === 0 ? "First" : "Last"} initial: ${puzzles[i].target[cell] ? "ink" : "clear"} row ${Math.floor(cell / puzzles[i].width) + 1}, column ${cell % puzzles[i].width + 1}.`;
              }
            }
            return "Seal ready.";
          }
        };
      }
    }
  ];

  NameOffice.clerkAvatar = clerkAvatar;
  NameOffice.departments = Object.freeze(departments);
})();
