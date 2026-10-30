"use strict";
// Optional integration suite; pass an installed Playwright package as argv[2] or PLAYWRIGHT_MODULE.
// Authored copy is editable. Check game state and generated answers, not fixed wording.
const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { resolve } = require("node:path");
const { readFile } = require("node:fs/promises");
const playwright = require(process.env.PLAYWRIGHT_MODULE || process.argv[2] || "playwright");
const url = pathToFileURL(resolve(__dirname, "../site/index.html")).href;
const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const engines = (option("engines") || process.env.TEST_BROWSERS || "chromium").split(",");
const screenshotDirectory = option("screenshots") || process.env.SCREENSHOT_DIR;
const seedOnly = process.argv.includes("--seed-only");
require("../site/rules.js");
const R = NameOffice.rules;
const queueTestTime = Date.UTC(2026, 9, 28, 12);
async function takeTicket(page) {
  if (await page.locator("#ticket-dialog").evaluate(dialog => dialog.open)) {
    await page.locator("#accept-ticket").click();
  }
}


async function verifyHeaderReferral(page) {
  const snapshot = () => page.evaluate(() => ({
    seed: document.body.dataset.runSeed,
    running: document.body.dataset.queueRunning,
    ticket: document.querySelector("#queue-number").textContent,
    serving: document.querySelector("#now-serving").textContent,
    department: document.querySelector(".progress [aria-current=step] span").textContent,
    answer: document.querySelector("#name-input")?.value
  }));
  const before = await snapshot();
  const expected = new URL(await page.locator('link[rel="canonical"]').getAttribute("href")); expected.hash = ""; expected.search = "";
  await page.evaluate(() => {
    window.headerCopied = null;
    window.referralExecCommand = document.execCommand;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.headerCopied = value; } } });
  });
  await page.locator("#refer-friend").click();
  assert.equal(await page.evaluate(() => window.headerCopied), expected.href.replace(/\/+$/, ""));
  const privateURL = await page.evaluate(() => {
    const canonical = document.querySelector('link[rel="canonical"]');
    const original = canonical.href;
    try { canonical.href = location.href; return NameOffice.sharing.challengeURL(); }
    finally { canonical.href = original; }
  });
  assert.equal(privateURL, null, "an unconfigured local file must not become a public challenge link");
  assert.deepEqual(await snapshot(), before, "referring a friend must preserve the current application and queue");
  assert.equal(await page.locator("#referral-feedback").isVisible(), true);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error("Clipboard blocked"); };
    document.execCommand = () => false;
  });
  await page.locator("#refer-friend").click();
  await page.locator("#referral-copy-field").waitFor({ state: "visible" });
  assert.equal(await page.locator("#referral-copy-field").inputValue(), expected.href.replace(/\/+$/, ""));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#referral-copy-field").isVisible(), false);
  assert.deepEqual(await snapshot(), before);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async value => { window.headerCopied = value; };
    document.execCommand = window.referralExecCommand;
  });
}

async function verifySharing(page, complete, artifactLabel) {
  const originalURL = page.url();
  const generalURL = new URL(await page.locator('link[rel="canonical"]').getAttribute("href"));
  generalURL.hash = ""; generalURL.search = "";
  const name = await page.locator(".certificate-name").textContent();
  const result = await page.locator(complete ? "#completion-time" : "#missed-department").textContent();
  await page.evaluate(() => {
    window.sharedData = null; window.copiedValues = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.copiedValues.push(value); } } });
    Object.defineProperty(navigator, "share", { configurable: true, writable: true, value: async data => { window.sharedData = data; } });
    Object.defineProperty(navigator, "canShare", { configurable: true, writable: true, value: data => !!data.files?.length });
  });
  await page.locator("#share-certificate").click();
  const shared = await page.evaluate(async () => {
    const { text, url, files } = window.sharedData;
    const file = files[0];
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    return { text, url, type: file.type, size: file.size, header: [...bytes.slice(0, 8)], width: view.getUint32(16), height: view.getUint32(20) };
  });
  assert.equal(shared.url, generalURL.href.replace(/\/+$/, ""), "sharing uses a general challenge link without a run seed");
  assert.equal(new URL(shared.url).protocol, "https:", "local HTML sharing must use the public HTTPS address");
  assert.equal(shared.text.includes("file:"), false, "shared results must not contain a local file address");
  assert.ok(shared.text.includes(name));
  assert.ok(shared.text.includes(complete ? result : result.replace(/^[0-9]+[: ·]+/, "")));
  assert.equal(shared.type, "image/png");
  assert.ok(shared.size > 1000);
  assert.deepEqual(shared.header, [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(shared.width, 1200); assert.equal(shared.height, 900);
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#save-certificate").click()]);
  const image = await readFile(await download.path());
  assert.deepEqual([...image.subarray(0, 8)], shared.header);
  assert.equal(image.readUInt32BE(16), 1200); assert.equal(image.readUInt32BE(20), 900);
  if (screenshotDirectory) await download.saveAs(resolve(screenshotDirectory, `name-office-${artifactLabel}-certificate.png`));
  await page.locator("#copy-result").click();
  assert.equal(await page.evaluate(() => window.copiedValues.at(-1)), shared.text);
  await page.locator("#challenge-friend").click();
  assert.equal(await page.evaluate(() => window.copiedValues.at(-1)), generalURL.href.replace(/\/+$/, ""));
  assert.equal(page.url(), originalURL, "sharing must not replace or restart the active run");
  // Browsers without image sharing can still share the text and link natively.
  await page.evaluate(() => { navigator.canShare = () => false; window.sharedData = null; });
  await page.locator("#share-certificate").click();
  assert.equal(await page.evaluate(() => window.sharedData.files), undefined);
  assert.equal(await page.evaluate(() => window.sharedData.url), generalURL.href.replace(/\/+$/, ""));
  // Cancelling a native sheet must not copy anything or report an error.
  const copiedCount = await page.evaluate(() => window.copiedValues.length);
  await page.evaluate(() => { navigator.share = async () => { throw new DOMException("Cancelled", "AbortError"); }; });
  await page.locator("#share-certificate").click();
  assert.equal(await page.evaluate(() => window.copiedValues.length), copiedCount);
  assert.equal(await page.locator(".sharing-feedback").textContent(), "");
  await page.evaluate(() => { navigator.share = async () => { throw new DOMException("Unavailable", "NotAllowedError"); }; });
  await page.locator("#share-certificate").click();
  await page.waitForFunction(count => window.copiedValues.length > count, copiedCount);
  assert.equal(await page.evaluate(() => window.copiedValues.at(-1)), shared.text);
  assert.equal(page.url(), originalURL, "a failed native share must not navigate away from the game");
  await page.evaluate(() => { navigator.share = undefined; });
  await page.locator("#share-certificate").click();
  await page.waitForFunction(count => window.copiedValues.length > count, copiedCount);
  assert.equal(await page.evaluate(() => window.copiedValues.at(-1)), shared.text);
  // If clipboard access is blocked, the applicant gets selectable text instead.
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error("Clipboard unavailable"); };
    document.execCommand = () => false;
  });
  await page.locator("#copy-result").click();
  await page.locator(".certificate-sharing .sharing-copy-field").waitFor({ state: "visible" });
  assert.equal(await page.locator(".certificate-sharing .sharing-copy-field").inputValue(), shared.text);
  await page.evaluate(() => { navigator.share = async () => { throw new DOMException("Cancelled", "AbortError"); }; });
  await page.locator("#share-certificate").click();
  assert.equal(await page.locator(".certificate-sharing .sharing-copy-field").isVisible(), false);
  assert.equal(await page.locator(complete ? "#completion-time" : "#missed-department").textContent(), result, "sharing keeps the result frozen");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}


for (const engine of engines) {
  const layouts = engine === "chromium" ? [
    { label: "desktop", width: 1440, height: 1100, name: "Dr. Doofenshmirtz" },
    { label: "narrow touch", width: 320, height: 740, name: "Élodie O’Turnip-AnneSou", touch: true },
    { label: "all vowels", width: 390, height: 844, name: "Aei Oua" },
    { label: "short first name", width: 375, height: 812, name: "A Bcdefghijklmnopqrst", touch: true }
  ] : [{ label: "desktop", width: 1280, height: 1000, name: "Lady Soup" }];

  for (const layout of process.argv.includes("--queue-only") || seedOnly ? [] : layouts) {
    test(`${engine}, ${layout.label}: all twelve departments, retries, hints, navigation and shredding`, { timeout: 90000 }, async () => {
      const browser = await playwright[engine].launch({ headless: true });
      try {
        const page = await browser.newPage({
          viewport: { width: layout.width, height: layout.height },
          hasTouch: !!layout.touch, reducedMotion: "reduce"
        });
        const errors = [];
        const network = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
        page.setDefaultTimeout(5000);
        await page.clock.setFixedTime(queueTestTime);
        await page.goto(url);
        assert.equal(await page.locator("#department-form").count(), 1, "the initial form must render");
        const runCode = await page.locator("body").getAttribute("data-run-seed");
        const runSeed = parseInt(runCode, 16);
        assert.match(runCode, /^[0-9A-F]{8}$/);
        assert.equal(new URL(page.url()).hash, `#seed=${runCode}`);
        const submit = async () => { await page.locator("#department-form [type=submit]").click(); await takeTicket(page); };
        const expectError = async () => {
          assert.equal(await page.locator("#message").evaluate(node => node.classList.contains("error")), true, "a rejected action must report an error");
        };
        let assistanceCount = 0;
        const hint = async () => {
          await page.locator("#hint-button").click();
          assistanceCount++;
          assert.equal(await page.locator("#message").evaluate(node => node.classList.contains("hint")), true);
          assert.equal(await page.locator("#message .clerk-speaker").getAttribute("data-clerk"), "4", "every department uses the dedicated assistance clerk");
        };
        const screenshot = async label => {
          if (screenshotDirectory) {
            await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-${layout.width}-${label}.png`), fullPage: true });
            if (["intake", "volume"].includes(label)) await page.locator(".application").screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-${layout.width}-${label}-form.png`) });
          }
        };
        const queueNumber = String(R.issueQueueTicket(R.createRandom(runSeed, "", "Queue")).number);
        assert.equal(await page.locator("#queue-number").evaluate(node => node.classList.contains("ticket-unissued")), true);
        const serving = await page.locator("#now-serving").textContent();
        assert.ok(Number(queueNumber) >= 100 && Number(queueNumber) <= 999);
        assert.equal(Number(queueNumber) - Number(serving), 30);
        assert.equal(await page.locator("body").getAttribute("data-queue-phase"), "waiting");
        assert.equal(await page.locator(".queue").isVisible(), true);
        assert.equal(await page.locator(".office-note").isVisible(), true);
        assert.ok(await page.locator("#message").evaluate(node => node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility === "hidden"), "empty feedback must reserve space with no visible border");
        const clipPosition = () => page.locator(".office-note").evaluate(note => {
          const clip = note.querySelector(".paperclip").getBoundingClientRect();
          const anchor = note.getBoundingClientRect();
          return { x: clip.left - anchor.left, y: clip.top - anchor.top };
        });
        const clipAnchor = await clipPosition();
        await screenshot("intake");
        async function stage(number) {
          assert.equal(await page.locator(".progress li").count(), 4);
          assert.equal(await page.locator(".progress [aria-current=step] span").textContent(), String(number).padStart(2, "0"));
          if (number >= 5) {
            const expected = [number - 3, number - 2, number - 1, number].map(i => String(i).padStart(2, "0"));
            assert.deepEqual(await page.locator(".progress li span").allTextContents(), expected);
          }
          assert.equal(parseInt(await page.locator("#receipt-count").textContent(), 10), number - 1);
          const entryFocus = ["#name-input", "#name-input", "#name-input", ".name-tile", ".loose-letter", ".lock-arrow", ".letter-stamp", ".archive-clerk", ".desk-maze", ".circuit-switch", ".copy-controls button", ".seal-cell:not(:disabled)"][number - 1];
          if (number <= 3) {
            assert.equal(await page.locator(entryFocus).first().evaluate(node => node === document.activeElement), true);
          } else {
            assert.equal(await page.evaluate(() => document.activeElement.id), "stage-title", "non-text puzzles must not focus a control before Tab");
            await page.keyboard.press("Tab");
            assert.equal(await page.locator(entryFocus).first().evaluate(node => node === document.activeElement), true, `department ${number}: first Tab must focus the primary control`);
          }
          if (number > 1) assert.equal(await page.locator("#queue-number").textContent(), queueNumber, "the ticket stays with the application");
          assert.equal(await page.locator("#now-serving").textContent(), serving);
          const clip = await clipPosition();
          assert.ok(Math.abs(clip.x - clipAnchor.x) < .1 && Math.abs(clip.y - clipAnchor.y) < .1, "the paperclip must stay anchored while the paper shifts");
          const placement = await page.locator(".office-note").evaluate(node => ["--note-x", "--note-y", "--note-angle"].map(name => parseFloat(node.style.getPropertyValue(name))));
          assert.ok(Math.abs(placement[0]) <= 4 && Math.abs(placement[1]) <= 3 && Math.abs(placement[2]) <= 3, "the note's movement must stay subtle");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `department ${number} must fit ${layout.width}px`);
          const receiptBeforeHint = await page.locator("#receipt-comment").textContent();
          await hint();
          if (number === 2) await hint(); // Repeated requests in the same department count separately.
          assert.equal(await page.locator("#receipt-comment").textContent(), receiptBeforeHint, "hints don't alter approved paperwork or the current hold");
          const messageCenterOffset = await page.locator("#message").evaluate(node => {
            const range = document.createRange();
            range.selectNodeContents(node.querySelector(".message-text"));
            const text = range.getBoundingClientRect();
            const box = node.getBoundingClientRect();
            return Math.abs((text.top + text.bottom) / 2 - (box.top + box.bottom) / 2);
          });
          assert.ok(messageCenterOffset < 4, "status text should sit vertically centered beside its bar");

        }
        const name = R.normalizeName(layout.name);
        const stageRandom = label => R.createRandom(runSeed, name, label);
        await stage(1);
        await page.locator("#name-input").click();
        assert.equal(await page.locator("#name-input").evaluate(node => getComputedStyle(node).outlineStyle), "none", "focused name fields should use the subtle inset border");
        await screenshot("intake-focused");
        await page.locator("#name-input").press("Tab");
        assert.notEqual(await page.locator("#department-form [type=submit]").evaluate(node => getComputedStyle(node).outlineStyle), "none", "keyboard focus remains visible on interactive controls");
        await page.locator("#name-input").fill("<script>");
        await submit();
        await expectError();
        await page.locator("#name-input").fill("Lady Soup Junior");
        await submit();
        await expectError();
        assert.equal(parseInt(await page.locator("#receipt-count").textContent(), 10), 0);
        await page.locator("#name-input").fill(layout.name);
        assert.equal(await page.locator("#message").textContent(), "", "editing an answer clears obsolete feedback");
        await page.locator("#name-input").press("Enter");
        await takeTicket(page);
        assert.equal(await page.locator("#receipt-name").textContent(), name);
        await stage(2);
        await screenshot("volume");
        await page.locator("#name-input").fill(layout.name.toUpperCase() + "!!!");
        await submit();
        await stage(3);
        await screenshot("customs");
        const customs = await page.evaluate(name => NameOffice.rules.customs(name), name);
        await page.locator("#name-input").fill((customs.replace(/y/gi, "").trim() || "NONE").toLowerCase() + "...");
        await submit();
        await stage(4);
        const tiles = page.locator(".name-tile");
        const labels = await tiles.allTextContents();
        assert.deepEqual(labels, R.makeNameEvidence(name, stageRandom("Evidence")));
        const exact = labels.flatMap((label, i) => label === name ? [i] : []);
        assert.equal(exact.length, 3);
        const punctuationDecoy = labels.indexOf(name + "!");
        assert.ok(punctuationDecoy >= 0);
        for (const index of [exact[0], exact[1], punctuationDecoy]) {
          await tiles.nth(index).focus();
          await page.keyboard.press("Space");
        }
        await submit();
        await expectError();
        for (const index of [punctuationDecoy, exact[2]]) {
          await tiles.nth(index).focus();
          await page.keyboard.press("Space");
        }
        assert.ok(await page.locator("#message").evaluate(node => node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility === "hidden"));
        await submit();
        await stage(5);
        assert.equal(await page.locator("#stage input").count(), 0, "recovery must have no text field");
        await screenshot("recovery");
        const characters = R.letters(name).filter(char => char !== " ");
        assert.deepEqual(await page.locator(".loose-letter").allTextContents(), R.shuffle(characters, stageRandom("Recovery")));
        assert.equal(await page.locator(".loose-letter").count(), characters.length);
        assert.ok(!(await page.locator(".loose-letter").allTextContents()).includes("␣"));
        if (!layout.touch) {
          const greenTile = page.locator(".letter-slot:nth-child(3n) .loose-letter").first();
          await greenTile.hover();
          assert.equal(await greenTile.evaluate(node => getComputedStyle(node).borderTopColor), "rgb(104, 118, 65)", "green salvage tiles must keep a green hover border");
          const paperTile = page.locator(".letter-slot:first-child .loose-letter");
          await paperTile.hover();
          assert.equal(await paperTile.evaluate(node => getComputedStyle(node).borderTopColor), "rgb(216, 86, 57)", "paper tiles retain their orange hover border");
        }
        const piece = char => page.locator(".loose-letter:visible").filter({ hasText: new RegExp(`^${char === " " ? "␣" : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first();
        // A typed name cannot bypass the recovery puzzle.
        await page.locator("#stage-title").focus();
        await page.keyboard.type(name);
        await submit();
        await expectError();
        await piece(characters[0]).click();
        await page.locator("#undo-letter").click();
        await piece(characters[0]).click();
        const wrongPiece = (await page.locator(".loose-letter:visible").allTextContents()).find(char => char !== characters[1]);
        await piece(wrongPiece).click();
        assert.equal(await page.locator(".loose-letter:visible").count(), characters.length, "a mistake must restore every piece");
        assert.equal(await page.locator("#undo-letter").isDisabled(), true);
        await expectError();
        for (const char of characters) {
          if (layout.touch) await piece(char).tap();
          else {
            await piece(char).focus();
            await page.keyboard.press("Space");
          }
        }
        assert.equal(await page.locator("#recovered-name").textContent(), name);
        await submit();
        await stage(6);
        assert.equal(await page.locator("#stage input").count(), 0);
        const lock = R.makeNameLock(name, stageRandom("Secrecy"));
        assert.deepEqual(await page.locator(".lock-letters").allTextContents(), lock.encoded.map(group => group || "—"));
        const lines = page.locator(".assessment-lines li");
        assert.equal(await lines.count(), 4);
        const encryptedAssessment = await lines.allTextContents();
        assert.ok(encryptedAssessment.every(line => line.length > 0));
        const wheels = page.locator(".lock-wheel");
        assert.equal(await wheels.count(), 4);
        await wheels.nth(0).locator(".lock-arrow").nth(1).click();
        assert.equal(await wheels.nth(0).getAttribute("data-value"), "9");
        await wheels.nth(0).locator(".lock-arrow").nth(0).click();
        assert.equal(await wheels.nth(0).getAttribute("data-value"), "0");
        await wheels.nth(0).locator(".lock-arrow").nth(0).click();
        await submit();
        await expectError();
        assert.deepEqual(await wheels.evaluateAll(nodes => nodes.map(node => Number(node.dataset.value))), [0, 0, 0, 0]);
        for (let i = 0; i < 4; i++) {
          const beforeLines = await lines.allTextContents();
          const control = wheels.nth(i).locator(".lock-arrow").nth(0);
          for (let turn = 0; turn < lock.combination[i]; turn++) {
            if (layout.touch) await control.tap();
            else { await control.focus(); await page.keyboard.press("ArrowUp"); }
          }
          const afterLines = await lines.allTextContents();
          for (let row = 0; row < 4; row++) assert.notEqual(afterLines[row], beforeLines[row], "each dial must affect every line");
        }
        const decodedAssessment = await lines.allTextContents();
        await wheels.nth(0).locator(".lock-arrow").nth(0).click();
        const shiftedLine = await lines.nth(0).textContent();
        assert.ok(shiftedLine.length > 0);
        assert.notEqual(shiftedLine, decodedAssessment[0]);
        const changedLines = await lines.allTextContents();
        for (let row = 0; row < 4; row++) assert.notEqual(changedLines[row], decodedAssessment[row]);
        const assignments = await lines.evaluateAll(nodes => nodes.map(node => [...node.children].filter(part => part.dataset.dial !== "").map(part => Number(part.dataset.dial))));
        assignments.forEach((dials, row) => assert.deepEqual(dials, dials.map((_, column) => (row + column) % 4)));
        await wheels.nth(0).locator(".lock-arrow").nth(1).click();
        assert.deepEqual(await lines.allTextContents(), decodedAssessment);
        await screenshot("secrecy");
        await submit();
        await stage(7);
        assert.equal(await page.locator(".letter-stamp").count(), 12);
        const trayShape = await page.locator(".letter-stamp").evaluateAll(nodes => ({
          rows: new Set(nodes.map(node => Math.round(node.getBoundingClientRect().top))).size,
          columns: new Set(nodes.map(node => Math.round(node.getBoundingClientRect().left))).size
        }));
        assert.deepEqual(trayShape, { rows: 3, columns: 4 });
        await screenshot("stamps");
        const stampTarget = name.toUpperCase().normalize("NFC");
        assert.equal(await page.locator(".reference-name .applicant-name").textContent(), name);
        const stampChars = R.letters(stampTarget);
        const stampRandom = stageRandom("Stamps");
        const seededStamps = R.makeNameStamps(name, stampRandom);
        assert.deepEqual(await page.locator(".letter-stamp").allTextContents(), R.makeStampTray(seededStamps.stamps, stampChars[0], stampRandom));
        const trayOrder = () => page.locator(".letter-stamp").evaluateAll(nodes => nodes
          .sort((a, b) => Number(a.style.order) - Number(b.style.order))
          .map(node => node.dataset.character).join("|"));
        const stamp = char => page.locator(`.letter-stamp[data-character="${char}"]`);
        const pickStamp = async char => {
          if (layout.touch) await stamp(char).tap();
          else { await stamp(char).focus(); await page.keyboard.press("Space"); }
        };
        const beforeFirstStamp = await trayOrder();
        await pickStamp(stampChars[0]);
        assert.notEqual(await trayOrder(), beforeFirstStamp, "the clerk must rearrange the stamps after a pick");
        assert.ok((await trayOrder()).split("|").some(char => !beforeFirstStamp.split("|").includes(char)), "reshuffling must change the stamp choices, not just their positions");
        const stamped = await page.locator("#stamped-name").textContent();
        const nextRequired = stampChars[R.letters(stamped).length];
        const wrongStamp = (await page.locator(".letter-stamp").allTextContents()).find(char => char !== nextRequired);
        const beforeWrongStamp = await trayOrder();
        await pickStamp(wrongStamp);
        await expectError();
        assert.notEqual(await trayOrder(), beforeWrongStamp);
        assert.equal(R.normalizeName(await page.locator("#stamped-name").textContent()), "", "a wrong stamp clears the stamped name automatically");
        let stampPosition = 0;
        while (stampPosition < stampChars.length) {
          const before = await trayOrder();
          await pickStamp(stampChars[stampPosition]);
          stampPosition++;
          while (stampChars[stampPosition] === " ") stampPosition++;
          assert.equal(await page.locator("#stamped-name").textContent(), stampChars.slice(0, stampPosition).join(""));
          assert.notEqual(await trayOrder(), before);
        }
        assert.equal(await page.locator(".letter-stamp:not(:disabled)").count(), 0);
        await submit();
        await stage(8);
        assert.deepEqual(await page.locator(".name-index > span").evaluateAll(nodes => nodes.map(node => node.dataset.character)), R.nameLetters(name), "Archive must number only letters, without a space slot");
        const archiveFiles = await page.locator(".archive-file").evaluateAll(nodes => nodes.map(node => ({ number: Number(node.dataset.number), seal: JSON.parse(node.dataset.seal) })));
        assert.deepEqual(archiveFiles, R.makeNameArchive(name, stageRandom("Archive")).files, "earlier mistakes and reshuffles must not affect Archive");
        assert.equal(await page.locator(".archive-file strong").evaluateAll(nodes => nodes.every(node => {
          const slots = [...node.children];
          return slots.length === 3 && slots.every(slot => slot.getBoundingClientRect().top === slots[0].getBoundingClientRect().top);
        })), true, "seal positions must stay on one row on narrow screens");
        const archiveClues = await page.locator(".archive-clerk").evaluateAll(nodes => nodes.map(node => ({ slot: node.dataset.slot === "number" ? null : Number(node.dataset.slot), position: Number(node.dataset.position), parity: Number(node.dataset.parity) })));
        const archiveTruths = file => archiveClues.map(clue => clue.slot === null
          ? file.number % 2 === clue.parity : file.seal[clue.slot] === R.nameLetters(name)[clue.position]);
        const original = archiveFiles.filter(file => archiveTruths(file).filter(Boolean).length === 3);
        assert.equal(original.length, 1);
        const liar = archiveTruths(original[0]).indexOf(false);
        const linkedClue = archiveClues.find(clue => clue.slot !== null);
        const linkedIndex = archiveClues.indexOf(linkedClue);
        const linkedClerk = page.locator(".archive-clerk").nth(linkedIndex);
        await linkedClerk.focus();
        assert.equal(await page.locator(".archive-linked").count(), 0, "focus alone must not pin linked highlights");
        await linkedClerk.hover();
        assert.equal(await page.locator(".archive-file strong .archive-linked").count(), 6);
        assert.equal(await page.locator(".name-index .archive-linked").count(), 1);
        await page.locator("#hint-button").hover();
        assert.equal(await page.locator(".archive-linked").count(), 0, "moving off a clerk must clear linked highlights");
        await linkedClerk.focus();
        await page.keyboard.down("Space");
        assert.equal(await page.locator(".archive-file strong .archive-linked").count(), 6);
        await page.keyboard.up("Space");
        assert.equal(await linkedClerk.getAttribute("aria-pressed"), "true");
        assert.equal(await page.locator(".archive-linked").count(), 0, "a selected clerk must not keep linked fields highlighted after release");
        if (layout.touch) {
          await linkedClerk.tap();
          assert.equal(await page.locator(".archive-linked").count(), 0, "touch release must clear highlights even while the tapped clerk retains focus");
        }
        await submit();
        await expectError();
        const incompleteArchiveError = await page.locator("#message").textContent();
        // A file satisfying every statement is a deliberate trap: one clerk MUST lie.
        const allHonest = archiveFiles.find(file => archiveTruths(file).every(Boolean));
        await page.locator(`.archive-file[data-number="${allHonest.number}"]`).click();
        await page.locator(".archive-clerk").nth(liar).click();
        await submit();
        await expectError();
        assert.equal(await page.locator("#message").textContent(), incompleteArchiveError, "a wrong file must not receive diagnostic feedback");
        await page.locator(`.archive-file[data-number="${original[0].number}"]`).click();
        assert.ok((await page.locator("#archive-context").textContent()).includes(String(original[0].number)));
        await page.locator(".archive-clerk").nth((liar + 1) % 4).click();
        await submit();
        await expectError();
        assert.equal(await page.locator("#message").textContent(), incompleteArchiveError, "the correct file with a wrong statement must receive the same error");
        if (layout.touch) await page.locator(".archive-clerk").nth(liar).tap();
        else {
          await page.locator(".archive-clerk").nth(liar).focus();
          await page.keyboard.press("Space");
        }
        assert.equal(await page.locator('.archive-file[aria-pressed="true"]').count(), 1);
        assert.equal(await page.locator('.archive-clerk[aria-pressed="true"]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await screenshot("archive");
        assert.equal(await page.locator("#message").textContent(), "", "changing the selected filing note clears obsolete errors");
        const recoveredApplication = `File ${original[0].number} / ${original[0].seal.join(" · ")}`;
        await submit();
        await stage(9);
        await screenshot("transit");
        const readMaze = () => page.locator(".desk-maze").evaluate(board => ({
          width: Number(board.dataset.width), start: Number(board.dataset.entrance),
          passages: [...board.querySelectorAll(".maze-cell")].map(node => JSON.parse(node.dataset.passages)),
          pickups: [...board.querySelectorAll("[data-piece-index]")].map(node => ({ cell: Number(node.dataset.cell), index: Number(node.dataset.pieceIndex), char: node.dataset.character })).sort((a, b) => a.index - b.index)
        }));
        const maze = await readMaze();
        assert.deepEqual(maze, R.makeNameMaze(name, stageRandom("Transit")));
        assert.equal(maze.width, 15);
        assert.equal(await page.locator(".maze-piece small").count(), 0, "maze letters must not have ordinal numbers");
        assert.equal(maze.pickups.map(piece => piece.char).join(""), name.split(" ")[0]);
        assert.ok(maze.pickups.every(piece => piece.char !== " "));
        assert.equal(maze.start, 112);
        assert.equal(await page.locator("#department-form [type=submit]").isDisabled(), true);
        assert.equal(await page.locator(".maze-cell").count(), 225);
        assert.equal(await page.locator(".current-desk .maze-plane").count(), 1);
        assert.equal(await page.locator(".desk-maze").getAttribute("data-facing"), "up");
        const layoutBefore = JSON.stringify(maze);
        await page.locator('.maze-cell[data-cell="0"]').click();
        assert.equal(await page.locator(".desk-maze").getAttribute("data-position"), String(maze.start), "pressing an unavailable square does not move the plane");
        assert.equal(await page.locator(".desk-maze").getAttribute("data-facing"), "up", "blocked moves keep the plane's heading");
        // Keyboard arrows travel to the next decision, rather than one tile.
        const keyNeighbor = maze.passages[maze.start][0];
        const keyOffset = keyNeighbor - maze.start;
        const keyDirection = { [-maze.width]: "up", 1: "right", [maze.width]: "down", "-1": "left" }[keyOffset];
        const keyTarget = R.mazeRun(maze, { position: maze.start, collected: 0 }, keyOffset);
        const keyResult = R.mazeMove(maze, { position: maze.start, collected: 0 }, keyTarget);
        await page.locator(".desk-maze").focus();
        await page.keyboard.press(`Arrow${keyDirection[0].toUpperCase() + keyDirection.slice(1)}`);
        assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), keyResult.position);
        assert.equal(await page.locator(".desk-maze").getAttribute("data-facing"), keyResult.kind === "wrong" ? "up" : keyDirection);
        await page.locator("#restart-maze").click();
        assert.equal(await page.locator(".desk-maze").getAttribute("data-position"), String(maze.start));
        assert.equal(await page.locator(".desk-maze").getAttribute("data-facing"), "up", "restart restores the initial heading");
        const touchSession = layout.touch ? await page.context().newCDPSession(page) : null;
        async function dragAlong(path, pressedCell = null) {
          await page.locator(".desk-maze").scrollIntoViewIfNeeded();
          const from = Number(await page.locator(".desk-maze").getAttribute("data-position"));
          const center = cell => page.locator(`.maze-cell[data-cell="${cell}"]`).evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          });
          const origin = await center(pressedCell ?? from);
          if (touchSession) await touchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...origin, id: 1 }] });
          else { await page.mouse.move(origin.x, origin.y); await page.mouse.down(); }
          if (pressedCell !== null) assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), pressedCell, "pressing a green square moves immediately, before release");
          try {
            // Compress straight runs into one pointer event to exercise fast dragging.
            let previous = pressedCell ?? from;
            for (let i = 0; i < path.length;) {
              const offset = path[i] - previous;
              let target = path[i++];
              while (i < path.length && path[i] - target === offset) target = path[i++];
              const point = await center(target);
              if (touchSession) await touchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, id: 1 }] });
              else await page.mouse.move(point.x, point.y);
              previous = target;
              if (!await page.locator(".desk-maze").evaluate(node => node.classList.contains("dragging-plane"))) break;
            }
          } finally {
            if (touchSession) await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            else await page.mouse.up();
          }
        }
        const firstPickup = maze.pickups[0].cell;
        await dragAlong(R.mazePath(maze, maze.start, firstPickup));
        assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "1", "dragging collects intermediate letters using the normal rules");
        assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), firstPickup, "release must not trigger an extra click");
        const wallNeighbor = [firstPickup - maze.width, firstPickup + maze.width, firstPickup - 1, firstPickup + 1]
          .find(cell => cell >= 0 && cell < maze.width ** 2 && Math.abs(cell % maze.width - firstPickup % maze.width) + Math.abs(Math.floor(cell / maze.width) - Math.floor(firstPickup / maze.width)) === 1 && !maze.passages[firstPickup].includes(cell));
        await dragAlong([wallNeighbor]);
        assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), firstPickup, "dragging cannot cross a wall");
        assert.equal(await page.locator(".desk-maze").evaluate(node => node.classList.contains("dragging-plane")), false);
        assert.equal(await page.locator(".current-desk").evaluate(node => getComputedStyle(node).backgroundColor), await page.locator(".reachable:not(.maze-piece)").first().evaluate(node => getComputedStyle(node).backgroundColor), "the plane uses the ordinary reachable-square color");
        await page.locator("#restart-maze").click();
        const greenPath = R.mazePath(maze, maze.start, firstPickup);
        let initialRun = 0;
        const initialOffset = greenPath[0] - maze.start;
        while (initialRun + 1 < greenPath.length && greenPath[initialRun + 1] - greenPath[initialRun] === initialOffset) initialRun++;
        await dragAlong(greenPath.slice(initialRun + 1), greenPath[initialRun]);
        assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), firstPickup, "a press away from the plane continues as a drag");
        assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "1");
        await page.locator("#restart-maze").click();
        let longMoves = 0;
        async function walk(path, stopAtReset = false) {
          let from = Number(await page.locator(".desk-maze").getAttribute("data-position"));
          for (let i = 0; i < path.length;) {
            const offset = path[i] - from;
            let target = path[i++];
            let distance = 1;
            while (i < path.length && path[i] - target === offset) { target = path[i++]; distance++; }
            if (distance > 1) longMoves++;
            const square = page.locator(`.maze-cell[data-cell="${target}"]`);
            if (layout.touch) await square.tap(); else await square.click();
            if (stopAtReset && await page.locator("#message").evaluate(node => node.classList.contains("error"))) return;
            assert.equal(Number(await page.locator(".desk-maze").getAttribute("data-position")), target);
            const direction = Math.abs(target - from) >= maze.width ? target < from ? "up" : "down" : target < from ? "left" : "right";
            assert.equal(await page.locator(".desk-maze").getAttribute("data-facing"), direction, "the plane faces the last pointer move");
            assert.equal(await page.locator(".current-desk .maze-plane").count(), 1);
            from = target;
          }
        }
        // Take an actual wrong branch: the required piece is treated as blocked,
        // so a reachable nonmatching letter causes a genuine wrong-letter pickup.
        let prefix = [];
        let position = maze.start;
        let wrongRoute;
        for (const piece of maze.pickups) {
          for (const later of maze.pickups.slice(piece.index + 1).filter(later => later.char.toUpperCase() !== piece.char.toUpperCase())) {
            const path = R.mazePath(maze, position, later.cell, [piece.cell]);
            if (path) { wrongRoute = path; break; }
          }
          if (wrongRoute) break;
          prefix.push(...R.mazePath(maze, position, piece.cell));
          position = piece.cell;
        }
        if (wrongRoute) {
        await dragAlong([...prefix, ...wrongRoute]);
        await expectError();
        assert.equal(await page.locator(".desk-maze").getAttribute("data-position"), String(maze.start), "a wrong letter during dragging resets to the center");
        assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "0");
        assert.equal(await page.locator(".desk-maze").evaluate(node => node.classList.contains("dragging-plane")), false, "wrong letters end the drag");
        await walk(prefix);
        await walk(wrongRoute, true);
        await expectError();
        assert.equal(await page.locator(".desk-maze").getAttribute("data-position"), String(maze.start));
        assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "0");
        assert.equal(await page.locator(".collected-piece").count(), 0);
        assert.equal(await page.locator(".maze-piece").count(), maze.pickups.length);
        assert.equal(layoutBefore, JSON.stringify(await readMaze()), "a reset must keep the same puzzle");
        }
        const alternative = maze.pickups.slice(1).find(piece => piece.char.toUpperCase() === maze.pickups[0].char.toUpperCase());
        if (alternative) {
          await walk(R.mazePath(maze, maze.start, alternative.cell));
          assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "1", "a later matching letter must count first");
          assert.deepEqual(JSON.parse(await page.locator(".desk-maze").getAttribute("data-found")), [alternative.cell]);
          await walk(R.mazePath(maze, alternative.cell, maze.start));
          await walk(R.mazePath(maze, maze.start, alternative.cell));
          assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), "1", "the same tile cannot be collected twice");
          await page.locator("#restart-maze").click();
        }
        position = maze.start;
        for (const piece of maze.pickups) {
          await walk(R.mazePath(maze, position, piece.cell));
          position = piece.cell;
          assert.equal(await page.locator(".desk-maze").getAttribute("data-collected"), String(piece.index + 1));
        }
        if (maze.pickups.length > 1) assert.ok(longMoves > 0, "rook clicks must travel multiple cells");
        assert.equal(await page.locator("#department-form [type=submit]").isDisabled(), false);
        assert.equal(await page.locator(".desk-maze").getAttribute("data-position"), String(maze.pickups.at(-1).cell));
        assert.equal(await page.locator(".desk-maze").getAttribute("data-exit"), null);
        assert.equal(await page.locator("#maze-name").textContent(), name.split(" ")[0]);
        await submit();
        await stage(10);
        await submit();
        await expectError();
        const power = R.makeNamePower(name, stageRandom("Energy"));
        const circuits = R.powerSolution(power);
        assert.equal(circuits.length, 3);
        assert.equal(await page.locator(".power-wires g").count(), 6);
        assert.equal(await page.locator(".switchboard-top .circuit-switch").count(), 3);
        assert.equal(await page.locator(".switchboard-bottom .circuit-switch").count(), 3);
        const bankOrder = await page.locator(".power-panel").evaluate(panel => {
          const upper = panel.querySelector(".switchboard-top").getBoundingClientRect();
          const lamps = panel.querySelector(".name-power").getBoundingClientRect();
          const lower = panel.querySelector(".switchboard-bottom").getBoundingClientRect();
          return upper.bottom < lamps.top && lamps.bottom < lower.top;
        });
        assert.equal(bankOrder, true, "the nameplate must sit between two banks of three switches");
        assert.equal(await page.locator(".power-wires path").count(), power.masks.reduce((count, mask) => count + R.circuitNumbers(mask).length, 0));
        for (let i = 0; i < 3; i++) await page.locator(".circuit-switch").nth(i).click();
        assert.equal(await page.locator(".circuit-switch:disabled").count(), 3);
        await page.locator(".circuit-switch").nth(3).evaluate(node => node.click());
        assert.equal(await page.locator('.circuit-switch[aria-pressed="true"]').count(), 3);
        for (let i = 0; i < 3; i++) await page.locator(".circuit-switch").nth(i).click();
        assert.equal(await page.locator(".circuit-switch:disabled").count(), 0);
        for (const number of circuits) await page.locator(".circuit-switch").nth(number - 1).click();
        assert.equal(await page.locator(".name-section.lit").count(), 6);
        assert.equal(await page.locator(".power-wires .powered").count(), 3);
        assert.equal(await page.locator(".name-section strong").allTextContents().then(parts => parts.join("")), name.replace(/ /g, ""));
        const nameRows = await page.locator(".name-power-row").evaluateAll(rows => rows.map(row => ({
          label: row.getAttribute("aria-label"),
          text: [...row.querySelectorAll("strong")].map(node => node.textContent).join(""),
          top: row.getBoundingClientRect().top,
          slots: [...row.querySelectorAll(".name-section")].map(node => ({ text: node.querySelector("strong").textContent, top: node.getBoundingClientRect().top }))
        })));
        assert.deepEqual(nameRows.map(row => row.text), name.split(" "));
        assert.ok(nameRows[1].top > nameRows[0].top);
        assert.ok(nameRows.every(row => row.slots.every(slot => slot.text.trim() && slot.top === row.top)), "each name must occupy a single row without blanks");
        await screenshot("power");
        await submit();
        await stage(11);
        const start = await page.locator("#copy-value").getAttribute("data-order");
        assert.equal(start, R.makeCopyPuzzle(name, stageRandom("Carbon")).start);
        await page.locator(".copy-controls button").nth(0).click();
        await page.locator("#copy-undo").click();
        assert.equal(await page.locator("#copy-value").getAttribute("data-order"), start);
        // Exhausting a wrong sequence must leave a working reset.
        for (let i = 0; i < 4; i++) await page.locator(".copy-controls button").nth(0).click();
        assert.equal(await page.locator(".copy-controls button").nth(0).isDisabled(), true);
        await submit();
        await expectError();
        await page.locator("#copy-reset").click();
        const operations = await page.evaluate(() => {
          const { copySolution } = NameOffice.rules;
          return copySolution(document.querySelector("#copy-value").dataset.order, document.querySelector("#copy-target").dataset.order);
        });
        for (const index of operations) await page.locator(".copy-controls button").nth(index).click();
        assert.equal(await page.locator("#copy-value b").allTextContents().then(parts => parts.join("")), name.replace(/ /g, ""));
        await screenshot("carbon");
        await submit();
        await stage(12);
        assert.equal(await page.locator("#stage input").count(), 0, "approval must be a new puzzle, not a recap form");
        await submit();
        await expectError();
        const sealBoards = page.locator(".seal-board");
        assert.equal(await sealBoards.count(), 2);
        const puzzles = await sealBoards.evaluateAll(boards => boards.map(board => ({
          width: Number(board.dataset.width), height: Number(board.dataset.height),
          rows: JSON.parse(board.dataset.rows), columns: JSON.parse(board.dataset.columns), givens: JSON.parse(board.dataset.givens)
        })));
        const glyphs = R.sealInitials(name).map(R.sealGlyph);
        if (glyphs.every(Boolean)) {
          const random = stageRandom("Approval");
          assert.deepEqual(puzzles.map(puzzle => puzzle.givens), glyphs.map(glyph => R.makeSealPuzzle(glyph, Math.floor(random() * 4294967296)).givens));
        }
        const solved = puzzles.map(puzzle => R.sealDeduction(puzzle));
        assert.ok(solved.every(grid => grid && !grid.includes(null)));
        const firstEditable = sealBoards.nth(0).locator(".seal-cell:not(:disabled)").first();
        await page.locator("#seal-blank").click();
        if (layout.touch) await firstEditable.tap(); else await firstEditable.click();
        assert.equal(await firstEditable.getAttribute("data-state"), "blank");
        await page.locator("#seal-undo").click();
        assert.equal(await firstEditable.getAttribute("data-state"), "empty");
        await page.locator("#seal-ink").click();
        if (layout.touch) await firstEditable.tap();
        else { await firstEditable.focus(); await page.keyboard.press("Space"); }
        assert.equal(await firstEditable.getAttribute("data-state"), "ink");
        await page.locator("#seal-reset").click();
        assert.equal(await firstEditable.getAttribute("data-state"), "empty");
        for (let i = 0; i < puzzles.length; i++) for (let cell = 0; cell < solved[i].length; cell++) {
          if (solved[i][cell] !== 1 || puzzles[i].givens[cell] === 1) continue;
          const tile = sealBoards.nth(i).locator(`.seal-cell[data-cell="${cell}"]`);
          if (layout.touch) await tile.tap();
          else { await tile.focus(); await page.keyboard.press("Space"); }
        }
        assert.equal(await page.locator(".seal-row-clue:not(.satisfied), .seal-column-clue:not(.satisfied)").count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await screenshot("approval");
        await page.clock.setFixedTime(queueTestTime + R.queueDurationMs - 1);
        await submit();
        assert.equal(await page.locator(".certificate:not(.certificate-missed)").count(), 1);
        assert.equal(await page.locator(".certificate-name").textContent(), name);
        assert.equal(await page.locator("#completion-time").textContent(), "4:59.999");
        assert.equal(Number((await page.locator("#assistance-summary").textContent()).match(/\d+/)?.[0]), assistanceCount);
        assert.equal(parseInt(await page.locator("#receipt-count").textContent(), 10), 12);
        assert.equal(await page.locator("#hint-button").isVisible(), false);
        assert.equal(await page.locator(".progress li").count(), 4);
        assert.equal(await page.locator(".personal-seal svg rect").count(), solved.flat().filter(Boolean).length, "the finished certificate must carry the player's seal");
        const securedServing = await page.locator("#now-serving").textContent();
        assert.equal(Number(queueNumber) - Number(securedServing), 1, "paperwork filed one millisecond before the deadline must succeed");
        await page.clock.setFixedTime(queueTestTime + R.queueDurationMs + 60000);
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        assert.equal(await page.locator("#now-serving").textContent(), securedServing, "completion freezes the queue");
        assert.equal(await page.locator("#completion-time").textContent(), "4:59.999", "the speedrun result must remain frozen after completion");
        assert.equal(await page.locator("body").getAttribute("data-queue-phase"), "complete");
        await screenshot("complete");
        if (layout.label === "desktop") await verifySharing(page, true, `${engine}-${layout.width}-approved`);
        await page.locator("#another-button").click();
        assert.notEqual(await page.locator("body").getAttribute("data-run-seed"), runCode, "a new application gets a new seed");
        assert.equal(await page.locator("#completion-time").count(), 0, "a new application must not display the old run's time");
        assert.equal(await page.locator("#assistance-summary").count(), 0);
        assert.equal(await page.locator("#queue-number").evaluate(node => node.classList.contains("ticket-unissued")), true);
        assert.deepEqual(await page.locator(".progress li span").allTextContents(), ["01", "02", "03", "04"]);
        await page.locator("#name-input").fill("Spare Name");
        await submit();
        await page.locator("#reset-button").click();
        assert.equal(await page.locator("#name-input").inputValue(), "");
        assert.deepEqual(network, [], "the game must make no network requests");
        assert.deepEqual(errors, [], "the game must have no runtime errors");
      } finally {
        await browser.close();
      }
    });
  }
}

for (const engine of engines) {
  if (!process.argv.includes("--queue-only")) test(`${engine}: run links replay puzzles and new applications receive fresh seeds`, { timeout: 30000 }, async () => {
    const browser = await playwright[engine].launch({ headless: true });
    try {
      const page = await browser.newPage({ reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${url}#seed=00000000`);
      assert.equal(await page.locator("body").getAttribute("data-run-seed"), "00000000");
      await page.goto(`${url}#seed=deadbeef`);
      await page.waitForFunction(() => document.body.dataset.runSeed === "DEADBEEF");
      const replayUrl = page.url();
      assert.equal(new URL(replayUrl).hash, "#seed=DEADBEEF");
      const ticket = await page.locator("#queue-number").textContent();
      const reachEvidence = async assistance => {
        if (assistance) await page.locator("#hint-button").click();
        for (const value of ["Lady Soup", "LADY SOUP", "Ldy Sp"]) {
          await page.locator("#name-input").fill(value);
          await page.locator("[type=submit]").click();
      await takeTicket(page);
        }
        if (assistance) {
          await page.locator("#hint-button").click();
          await page.evaluate(() => { for (let i = 0; i < 100; i++) Math.random(); });
        }
        return page.evaluate(() => ({
          tiles: [...document.querySelectorAll(".name-tile")].map(node => node.textContent),
          paper: document.querySelector(".office-note").getAttribute("style")
        }));
      };
      const original = await reachEvidence(false);
      await page.goto(replayUrl);
      await page.reload();
      assert.equal(await page.locator("#queue-number").textContent(), ticket);
      assert.deepEqual(await reachEvidence(true), original, "same URL and name must reproduce the puzzle despite assistance or unrelated randomness");
      await page.locator(".skip-link").evaluate(node => node.click());
      await page.waitForFunction(() => location.hash === "#seed=DEADBEEF");
      assert.equal(await page.locator(".progress [aria-current=step] span").textContent(), "04", "in-page navigation must keep the current puzzle and seed");
      await page.locator("#reset-button").click();
      const freshCode = await page.locator("body").getAttribute("data-run-seed");
      assert.notEqual(freshCode, "DEADBEEF");
      assert.equal(new URL(page.url()).hash, `#seed=${freshCode}`);
      await page.reload();
      assert.equal(await page.locator("body").getAttribute("data-run-seed"), freshCode, "reload must replay the seed in the URL");
      await page.goto(`${url}#seed=invalid`);
      await page.waitForFunction(() => /^[0-9A-F]{8}$/.test(location.hash.slice(6)));
      assert.match(await page.locator("body").getAttribute("data-run-seed"), /^[0-9A-F]{8}$/);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });

  if (!seedOnly) test(`${engine}: queue deadlines, escalation, background catch-up and restart`, { timeout: 45000 }, async () => {
    const browser = await playwright[engine].launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: engine === "chromium" ? 375 : 1280, height: 900 }, reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.clock.install({ time: queueTestTime });
      await page.goto(url);
      await page.clock.pauseAt(queueTestTime + 60000);
      const phase = () => page.locator("body").getAttribute("data-queue-phase");
      const nowServing = async () => Number(await page.locator("#now-serving").textContent());
      const original = await nowServing();
      const ticket = original + 30;
      assert.equal(ticket - original, 30);
      await page.clock.fastForward(600000);
      assert.equal(await phase(), "waiting", "opening instructions do not consume the deadline");
      assert.equal(await nowServing(), original);
      await verifyHeaderReferral(page);
      await page.locator("#hint-button").click(); // Intake assistance belongs to this application too.
      await page.locator("#name-input").fill("Lady Soup Junior");
      await page.locator("[type=submit]").click();
      await takeTicket(page);
      assert.equal(await phase(), "waiting", "invalid intake does not start the queue");
      await page.locator("#name-input").fill("Lady Soup");
      await page.locator("#name-input").press("Enter");
      assert.equal(await page.locator("#ticket-dialog").evaluate(dialog => dialog.open), true);
      assert.equal(await page.locator("#ticket-title").evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator("#ticket-title").evaluate(node => getComputedStyle(node).outlineStyle), "none");
      assert.equal(await page.locator("#ticket-dialog").evaluate(node => getComputedStyle(node).outlineStyle), "none");
      await page.keyboard.press("Tab");
      assert.equal(await page.locator("#accept-ticket").evaluate(node => node === document.activeElement), true);
      assert.equal(Number(await page.locator("#issued-ticket-number").textContent()), ticket);
      await page.clock.fastForward(600000);
      assert.equal(await phase(), "waiting", "reading the ticket must not start the clock");
      assert.equal(await nowServing(), original);
      if (screenshotDirectory) await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-ticket.png`), fullPage: true });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#ticket-dialog").evaluate(dialog => dialog.open), false);
      assert.equal(await phase(), "waiting");
      assert.equal(await page.locator("#name-input").evaluate(node => node === document.activeElement), true);
      await page.locator("[type=submit]").click();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("main").evaluate(node => node.inert), true);
      assert.equal(await page.locator("body").evaluate(node => node.classList.contains("ticket-reveal")), true);
      assert.equal(await page.locator("body").getAttribute("data-queue-running"), "false");
      await page.clock.fastForward(220);
      if (screenshotDirectory) await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-ticket-reveal.png`), fullPage: true });
      await page.clock.fastForward(780);
      assert.equal(await page.locator("main").evaluate(node => node.inert), true, "the counter must remain revealed before the rest of the page");
      await page.clock.fastForward(400);
      assert.equal(await page.locator("main").evaluate(node => node.inert), false);
      assert.equal(await page.locator("body").evaluate(node => node.classList.contains("ticket-present")), false);
      assert.equal(await page.locator("#name-input").evaluate(node => node === document.activeElement), true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await phase(), "normal");
      assert.equal(Number(await page.locator("#queue-number").textContent()), ticket);
      await page.locator("#hint-button").click();
      await page.locator("#hint-button").click();
      await page.locator("#name-input").fill("LAD");
      await verifyHeaderReferral(page);
      await page.clock.fastForward(9999);
      assert.equal(await nowServing(), original);
      await page.clock.fastForward(1);
      assert.equal(await nowServing(), original + 1);
      await page.locator("#department-form").evaluate(form => { form.style.minHeight = "1500px"; });
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.locator("#queue-ticker").waitFor({ state: "visible" });
      assert.equal(await page.locator("#queue-ticker").isVisible(), true);
      await page.locator("#department-form").evaluate(form => { form.style.minHeight = ""; });
      await page.clock.fastForward(170000);
      assert.equal(await phase(), "warning");
      assert.equal(ticket - await nowServing(), 12);
      await page.locator("#name-input").fill("LADY SOUP");
      await page.locator("[type=submit]").click();
      await takeTicket(page);
      assert.equal(await phase(), "warning", "clearing a department must not restart the deadline");
      assert.equal(ticket - await nowServing(), 12);
      const receipt = await page.locator("#receipt-comment").textContent();
      await page.clock.fastForward(60000);
      assert.equal(await phase(), "urgent");
      assert.equal(ticket - await nowServing(), 6);
      assert.equal(await page.locator("#receipt-comment").textContent(), receipt, "queue warnings must not change paperwork records");
      await page.clock.fastForward(30000);
      assert.equal(await phase(), "critical");
      assert.equal(ticket - await nowServing(), 3);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      assert.equal(await page.locator(".queue-screen").evaluate(node => getComputedStyle(node).animationName), "queue-pulse");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.locator(".queue-screen").evaluate(node => getComputedStyle(node).animationName), "none", "urgency respects reduced motion");
      if (screenshotDirectory) await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-queue-critical.png`), fullPage: true });
      await page.clock.fastForward(20000);
      assert.equal(ticket - await nowServing(), 1);
      await page.clock.fastForward(10000);
      assert.equal(await phase(), "missed");
      assert.equal(await nowServing(), ticket);
      assert.equal(await page.locator("#department-form").count(), 0);
      assert.equal(await page.locator(".progress").isVisible(), true);
      assert.equal(await page.locator(".certificate-missed").count(), 1);
      assert.equal(await page.locator("#missed-number").textContent(), String(ticket));
      assert.equal(await page.locator("#missed-forms").textContent(), "2");
      const reached = await page.locator("#missed-department").textContent();
      assert.equal(parseInt(reached, 10), 3);
      assert.ok(reached.endsWith(await page.evaluate(() => NameOffice.departments[2].label)));
      assert.equal(Number((await page.locator("#assistance-summary").textContent()).match(/\d+/)?.[0]), 3);
      const outcomeLayout = await page.locator(".certificate-missed").evaluate(certificate => {
        const stamp = certificate.querySelector(".outcome-stamp");
        const button = certificate.querySelector("#missed-restart");
        const center = element => { const rect = element.getBoundingClientRect(); return rect.left + rect.width / 2; };
        const style = getComputedStyle(stamp);
        return {
          stampOffset: Math.abs(center(stamp) - center(certificate)),
          buttonOffset: Math.abs(center(button) - center(certificate)),
          margins: [style.marginTop, style.marginBottom],
          resultBetween: stamp.getBoundingClientRect().bottom < certificate.querySelector(".run-result").getBoundingClientRect().top
            && certificate.querySelector(".run-result").getBoundingClientRect().bottom < button.getBoundingClientRect().top
        };
      });
      assert.ok(outcomeLayout.stampOffset < 1 && outcomeLayout.buttonOffset < 1, "the missed stamp and restart button must both be centered");
      assert.deepEqual(outcomeLayout.margins, ["7px", "20px"], "failure must retain the approved stamp's tuned spacing");
      assert.equal(outcomeLayout.resultBetween, true, "the time window must separate the missed stamp from the restart button");
      assert.equal(await page.locator("#message").textContent(), "", "the rejection notice is self-contained");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator("#hint-button").isVisible(), false);
      assert.equal(await page.locator("#queue-ticker").isVisible(), false);
      await verifySharing(page, false, `${engine}-missed`);
      if (screenshotDirectory) await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-queue-missed.png`), fullPage: true });
      await page.locator("#missed-restart").click();
      const fresh = await nowServing() + 30;
      assert.equal(fresh - await nowServing(), 30);
      assert.equal(await page.locator(".progress").isVisible(), true);
      assert.equal(await phase(), "waiting");
      assert.equal(parseInt(await page.locator("#receipt-count").textContent(), 10), 0);
      assert.equal(await page.locator("#name-input").inputValue(), "");
      await page.clock.fastForward(600000);
      assert.equal(await phase(), "waiting");
      await page.locator("#name-input").fill("Lady Soup");
      await page.locator("[type=submit]").click();
      await takeTicket(page);
      const began = await page.evaluate(() => Date.now());
      // No timer callback is run: the submission itself must reject a late form.
      await page.clock.setFixedTime(began + R.queueDurationMs);
      await page.locator("#name-input").fill("LADY SOUP");
      await page.locator("[type=submit]").click();
      await takeTicket(page);
      assert.equal(await phase(), "missed");
      assert.equal(Number((await page.locator("#assistance-summary").textContent()).match(/\d+/)?.[0]), 0);
      if (screenshotDirectory) await page.screenshot({ path: resolve(screenshotDirectory, `name-office-${engine}-one-form-missed.png`), fullPage: true });
      await page.locator("#missed-restart").click();
      await page.locator("#hint-button").click();
      await page.locator("#name-input").fill("Lady Soup");
      await page.locator("[type=submit]").click();
      await takeTicket(page);
      const restarted = await page.evaluate(() => Date.now());
      await page.clock.setFixedTime(restarted + 20 * 60000);
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      assert.equal(await phase(), "missed", "returning after a long background gap expires the application immediately");
      assert.equal(Number((await page.locator("#assistance-summary").textContent()).match(/\d+/)?.[0]), 1);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
